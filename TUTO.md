# TUTO — Nœud de failover Quantix sur un second PC (PC2)

Objectif : quand PC1 s'éteint, PC2 prend le relais — le nœud continue de
miner la chaîne **et** les relayers bridge (Solana / Polygon / Stellar)
restent joignables via les mêmes URLs publiques Cloudflare.

```
PC1 (principal)                        PC2 (secours)
─────────────────                      ─────────────────────
quantix-master (mine)                  quantix-node (suiveur)
quantix-explorer                          ↓ watchdog (toutes les 2 min)
quantix-standard                     PC1 down 3× → mining ON
relayers ×3                             + relayers ON
tunnels cloudflared                     + tunnels réplicas ON
                                     PC1 back → tout OFF, resync
```

**Règle d'or** : jamais deux mineurs, jamais deux relayers en parallèle.
La resync ne sait pas réorganiser une chaîne fourchue, et le claim
Supabase des relayers n'est pas atomique (risque de double-mint). Le
watchdog garantit le mode actif/passif — ne démarre jamais la stack
failover à la main pendant que PC1 tourne.

---

## 1. Prérequis

### Sur PC2

- Windows 10/11 avec [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)
- PowerShell 5.1+ (fourni avec Windows)
- ~15 GB libres (la chaîne ~200 MB + images Docker)

### Réseau entre les deux PC

Le nœud de PC2 doit joindre le P2P de PC1 (port **6001**) et son API
(port **3001**). Deux options :

| Option | Commande | Remarque |
|---|---|---|
| **Tailscale** (recommandé) | installer sur les 2 PC, `tailscale ip -4` | zéro config routeur, chiffré, marche hors du LAN |
| Redirection de port | box → 6001 TCP + 3001 TCP → PC1 | expose les ports sur Internet, IP publique nécessaire |

Dans la suite, `<PC1>` = IP Tailscale (ou LAN) de PC1. Vérifier depuis
PC2 :

```powershell
curl http://<PC1>:3001/debug     # doit renvoyer {"height": ...}
```

### Récupérer les secrets Cloudflare (sur PC1)

Le failover a besoin des tokens des deux tunnels :

```powershell
# Sur PC1
cd C:\Users\moi\Desktop\quantumresistantcoin
Select-String -Path .env -Pattern "TUNNEL"          # token du tunnel nœud
cd C:\Users\moi\Desktop\quantix-key-forge
Select-String -Path .env -Pattern "TUNNEL"          # token du tunnel relayer
```

Et les fichiers d'environnement des relayers (clés privées des bridges) :

```
quantix-key-forge\relayer-solana\.env
quantix-key-forge\relayer-polygon\.env
quantix-key-forge\relayer-stellar\.env
```

> ⚠️ Ces fichiers contiennent les clés privées des vaults bridge.
> Transfert par clé USB ou `scp` — **jamais** par Git, mail ou cloud non
> chiffré. Note : ils ont été commités par le passé dans l'historique
> GitHub — prévoir une rotation des clés à terme.

---

## 2. Installation sur PC2

### 2.1 Cloner les dépôts

```powershell
cd C:\Users\<toi>\Desktop   # ou le dossier de ton choix
git clone https://github.com/lizardspace2/quantumresistantcoin.git
git clone https://github.com/lizardspace2/quantix-key-forge.git
```

### 2.2 Réseau Docker partagé

```powershell
docker network create quantix-universal-net
```

### 2.3 Configurer le nœud

`quantumresistantcoin\.env` :

```env
PEERS=ws://<PC1>:6001
ENABLE_MINING=false
```

`ENABLE_MINING=false` : le nœud démarre en suiveur ; c'est le watchdog
qui le basculera en mineur.

### 2.4 Démarrer le nœud et synchroniser

```powershell
cd quantumresistantcoin
docker compose -f docker-compose-peer.yml up -d --build
docker logs -f quantix-node
```

Première sync : ~30 min pour ~24 000 blocs (vérification Dilithium).
Vérifier :

```powershell
curl http://localhost:3001/debug
# {"height": doit converger vers la hauteur du master, "isSyncing": false}
```

### 2.5 Installer les secrets relayer

Copier depuis PC1 :

```
relayer-solana\.env   → PC2:\...\quantix-key-forge\relayer-solana\.env
relayer-polygon\.env  → PC2:\...\quantix-key-forge\relayer-polygon\.env
relayer-stellar\.env  → PC2:\...\quantix-key-forge\relayer-stellar\.env
```

`quantix-key-forge\.env` (nouveau fichier sur PC2) :

```env
CLOUDFLARE_NODE_TUNNEL_TOKEN=<token du tunnel quantix-tunnel de PC1>
CLOUDFLARE_RELAYER_TUNNEL_TOKEN=<token du tunnel quantix-relayer-tunnel de PC1>
```

### 2.6 Pré-construire les images relayer (recommandé)

Pour que le failover démarre vite le jour J :

```powershell
cd quantix-key-forge
docker compose -f docker-compose-failover.yml --profile failover build
```

Ne **pas** lancer `up` — le profil `failover` est réservé au watchdog.

### 2.7 Configurer le watchdog

Éditer `quantumresistantcoin\scripts\mining-watchdog.ps1` :

```powershell
$MasterUrl  = "http://<PC1>:3001/debug"
$ComposeDir = "C:\Users\<toi>\Desktop\quantumresistantcoin"
$RelayerDir = "C:\Users\<toi>\Desktop\quantix-key-forge"
```

Tester à la main (avec PC1 allumé — ne doit rien changer) :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\mining-watchdog.ps1
type watchdog.log
# → "Master reachable" ou aucune action ; ENABLE_MINING reste false
```

Planifier toutes les 2 min :

```powershell
schtasks /create /tn QuantixWatchdog /sc minute /mo 2 /ru SYSTEM `
  /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\<toi>\Desktop\quantumresistantcoin\scripts\mining-watchdog.ps1"
```

---

## 3. Ce qui se passe en cas de panne

### PC1 s'éteint

1. Le watchdog voit 3 échecs consécutifs sur `/debug` (~6 min)
2. `ENABLE_MINING=true` → le conteneur `quantix-node` est recréé et mine
3. `docker-compose-failover.yml --profile failover up -d` :
   relayers + réplicas `cloudflared` démarrent
4. Cloudflare route `solana-relayer.*`, `master.*`, `p2p.*` vers PC2
   (la réplica résout les noms de service localement — d'où l'alias
   réseau `quantix-master` posé sur le nœud de PC2)
5. La chaîne continue de grandir, les bridges répondent

### PC1 revient

1. `quantix-node` reconnecte le master en ≤ 5 s et lui envoie sa chaîne
   (même base → simple ajout de blocs, pas de reorg nécessaire)
2. Le watchdog détecte `/debug` OK → arrête la stack failover, repasse
   `ENABLE_MINING=false`, recrée le conteneur en suiveur
3. Le master resynchronise les blocs produits pendant son absence

---

## 4. Vérifications

| Test | Commande | Attendu |
|---|---|---|
| Nœud sync | `curl localhost:3001/debug` | `height` = master, `isSyncing:false` |
| Mining off | `docker logs quantix-node --tail 20` | pas de `Mined block` |
| Watchdog | `type watchdog.log` | strikes remis à 0 tant que PC1 répond |
| Failover OFF | `docker ps` | pas de `*-failover`, pas de `quantix-relayer-*` |

**Test de panne (optionnel, un dimanche calme)** : éteindre le master
sur PC1 (`docker stop quantix-master`), attendre ~7 min, vérifier sur
PC2 que `quantix-node` mine et que les relayers tournent
(`docker ps`). Rallumer PC1, vérifier le retour à la normale dans le
`watchdog.log`.

---

## 5. Limites connues

- **Fenêtre de course au retour de PC1** (~30 s) : si le master mine un
  bloc avant d'avoir absorbé la chaîne de PC2, il peut rester sur un
  bloc orphelin. Si ça arrive : `rm data/blockchain.json` sur le master
  + resync depuis PC2 (la procédure de wipe utilisée pour l'explorer).
- **Tx bridge bloquée en `minting`** : si PC1 meurt *pendant* un mint,
  la transaction reste figée en `minting` et le relayer de PC2 ne la
  reprend pas. Reset manuel :
  `cd relayer-solana && npx tsx clean_stuck_tx.ts`.
- **`node-explorer.quantumresistantcoin.com` hors service** pendant le
  failover : pas d'explorer sur PC2 (il coûterait une copie complète +
  indexer).
- **Overlap de quelques secondes** entre démarrage des relayers PC2 et
  arrêt effectif de PC1 : le claim non-atomique laisse un risque de
  double-mint résiduel — à corriger un jour par une condition
  `.eq('status','pending')` sur l'update Supabase.
- **Clés bridge compromises dans l'historique git** : les `.env` /
  `*_keys.json` ont été commités puis détrackés — l'historique GitHub
  les contient encore. Rotation des vaults recommandée.

---

## 6. Dépannage rapide

| Symptôme | Cause probable | Action |
|---|---|---|
| `connection failed ws://<PC1>:6001` | PC1 éteint ou port fermé | normal en failover ; sinon firewall/Tailscale |
| Le nœud ne mine pas en failover | `isSyncing` encore vrai | attendre la fin de sync (par design) |
| Relayers 502 via tunnel | conteneurs pas sur `quantix-universal-net` | `docker network ls`, recréer le réseau |
| `Invalid State Root` en boucle | état corrompu (rare) | wipe `node/data/` + resync |
| Double conteneur même nom | stack lancée à la main pendant que watchdog agit | `docker compose -f docker-compose-failover.yml --profile failover stop` |
