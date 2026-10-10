# TUTO — Quantix failover node on a second PC (PC2)

Goal: when PC1 goes offline, PC2 takes over — the node keeps mining the
chain **and** the bridge relayers (Solana / Polygon / Stellar) stay
reachable through the same public Cloudflare URLs.

```
PC1 (primary)                          PC2 (backup)
─────────────────                      ─────────────────────
quantix-master (mines)                 quantix-node (follower)
quantix-explorer                          ↓ watchdog (every 2 min)
quantix-standard                     PC1 down 3× → mining ON
relayers ×3                             + relayers ON
cloudflared tunnels                     + tunnel replicas ON
                                     PC1 back → all OFF, resync
```

**Golden rule**: never two miners, never two parallel relayers. The
sync code cannot reorg a forked chain, and the relayers' Supabase claim
is not atomic (double-mint risk). The watchdog enforces active/passive
mode — never start the failover stack by hand while PC1 is running.

---

## 1. Prerequisites

### On PC2

- Windows 10/11 with [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)
- PowerShell 5.1+ (bundled with Windows)
- ~15 GB free (chain ~200 MB + Docker images)

### Network between the two PCs

PC2's node must reach PC1's P2P port (**6001**) and its HTTP API
(**3001**). Two options:

| Option | How | Notes |
|---|---|---|
| **Tailscale** (recommended) | install on both PCs, `tailscale ip -4` | zero router config, encrypted, works off-LAN |
| Port forwarding | router → 6001 TCP + 3001 TCP → PC1 | exposes ports on the Internet, needs a public IP |

Below, `<PC1>` = PC1's Tailscale (or LAN) IP. Verify from PC2:

```powershell
curl http://<PC1>:3001/debug     # must return {"height": ...}
```

### Retrieve the Cloudflare secrets (on PC1)

Failover needs both tunnel tokens:

```powershell
# On PC1
cd C:\Users\moi\Desktop\quantumresistantcoin
Select-String -Path .env -Pattern "TUNNEL"          # node tunnel token
cd C:\Users\moi\Desktop\quantix-key-forge
Select-String -Path .env -Pattern "TUNNEL"          # relayer tunnel token
```

And the relayer env files (bridge private keys):

```
quantix-key-forge\relayer-solana\.env
quantix-key-forge\relayer-polygon\.env
quantix-key-forge\relayer-stellar\.env
```

> ⚠️ These files hold the bridge vault private keys. Transfer via USB
> stick or `scp` — **never** through Git, email, or unencrypted cloud.
> Note: they were previously committed to GitHub history — plan a key
> rotation at some point.

---

## 2. PC2 installation

### 2.1 Clone the repositories

```powershell
cd C:\Users\<you>\Desktop   # or any folder
git clone https://github.com/lizardspace2/quantumresistantcoin.git
git clone https://github.com/lizardspace2/quantix-key-forge.git
git clone https://github.com/lizardspace2/dilithium-coin-explorer.git
```

`dilithium-coin-explorer` provides the indexer that feeds Supabase for
the web explorer (the frontend is hosted on Vercel and survives PC1 on
its own).

### 2.2 Shared Docker network

```powershell
docker network create quantix-universal-net
```

### 2.3 Configure the node

`quantumresistantcoin\.env`:

```env
PEERS=ws://<PC1>:6001
ENABLE_MINING=false
```

`ENABLE_MINING=false`: the node starts as a follower; the watchdog will
flip it to miner.

### 2.4 Start the node and sync

```powershell
cd quantumresistantcoin
docker compose -f docker-compose-peer.yml up -d --build
docker logs -f quantix-node
```

Initial sync: ~30 min for ~24,000 blocks (Dilithium verification).
Check:

```powershell
curl http://localhost:3001/debug
# {"height": must converge to the master height, "isSyncing": false}
```

### 2.5 Install the relayer secrets

Copy from PC1:

```
relayer-solana\.env   → PC2:\...\quantix-key-forge\relayer-solana\.env
relayer-polygon\.env  → PC2:\...\quantix-key-forge\relayer-polygon\.env
relayer-stellar\.env  → PC2:\...\quantix-key-forge\relayer-stellar\.env
```

`quantix-key-forge\.env` (new file on PC2):

```env
CLOUDFLARE_NODE_TUNNEL_TOKEN=<token of the quantix-tunnel on PC1>
CLOUDFLARE_RELAYER_TUNNEL_TOKEN=<token of the quantix-relayer-tunnel on PC1>
```

And for the explorer indexer, copy `dilithium-coin-explorer`'s `.env`
(Supabase keys) to the same path on PC2:

```
dilithium-coin-explorer\.env  → PC2:\...\dilithium-coin-explorer\.env
```

### 2.6 Pre-build the relayer images (recommended)

So failover starts quickly on the day it matters:

```powershell
cd quantix-key-forge
docker compose -f docker-compose-failover.yml --profile failover build
```

Do **not** run `up` — the `failover` profile is reserved for the
watchdog.

### 2.7 Configure the watchdog

Edit `quantumresistantcoin\scripts\mining-watchdog.ps1`:

```powershell
$MasterUrl  = "http://<PC1>:3001/debug"
$ComposeDir = "C:\Users\<you>\Desktop\quantumresistantcoin"
$RelayerDir = "C:\Users\<you>\Desktop\quantix-key-forge"
```

Test manually (with PC1 online — should change nothing):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\mining-watchdog.ps1
type watchdog.log
# → "Master reachable" or no action; ENABLE_MINING stays false
```

Schedule every 2 minutes:

```powershell
schtasks /create /tn QuantixWatchdog /sc minute /mo 2 /ru SYSTEM `
  /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\<you>\Desktop\quantumresistantcoin\scripts\mining-watchdog.ps1"
```

---

## 3. What happens during an outage

### PC1 goes down

1. The watchdog sees 3 consecutive `/debug` failures (~6 min)
2. `ENABLE_MINING=true` → the `quantix-node` container is recreated and mines
3. `docker-compose-failover.yml --profile failover up -d`:
   relayers + `cloudflared` replicas + explorer indexer start
4. Cloudflare routes `solana-relayer.*`, `master.*`, `node-explorer.*`,
   `p2p.*` to PC2 (the replica resolves service names locally — hence
   the `quantix-master` and `quantix-explorer` network aliases on PC2's
   node)
5. The chain keeps growing, the bridges respond, the web explorer
   (Vercel + Supabase) stays fed by PC2's indexer

### PC1 comes back

1. `quantix-node` reconnects to the master within ≤ 5 s and sends its
   chain (same base → plain block append, no reorg needed)
2. The watchdog detects `/debug` OK → stops the failover stack, flips
   `ENABLE_MINING=false`, recreates the container as a follower
3. The master resyncs the blocks produced while it was offline

---

## 4. Checks

| Test | Command | Expected |
|---|---|---|
| Node synced | `curl localhost:3001/debug` | `height` = master, `isSyncing:false` |
| Mining off | `docker logs quantix-node --tail 20` | no `Mined block` |
| Watchdog | `type watchdog.log` | strikes reset to 0 while PC1 answers |
| Failover OFF | `docker ps` | no `*-failover`, no `quantix-relayer-*` |

**Controlled outage test (optional, on a quiet day)**: stop the master
on PC1 (`docker stop quantix-master`), wait ~7 min, check on PC2 that
`quantix-node` mines and the relayers run (`docker ps`). Power PC1 back
on, verify the return to normal in `watchdog.log`.

---

## 5. Known limitations

- **Race window when PC1 returns** (~30 s): if the master mines its own
  block before absorbing PC2's chain, it can get stuck on an orphan. If
  that happens: `rm data/blockchain.json` on the master + resync from
  PC2 (the wipe procedure already used for the explorer).
- **Bridge tx stuck in `minting`**: if PC1 dies *mid-mint*, the
  transaction stays frozen in `minting` and PC2's relayer won't pick it
  up. Manual reset: `cd relayer-solana && npx tsx clean_stuck_tx.ts`.
- **Explorer display lag** during the first failover minutes: PC2's
  indexer polls every 5 min and must first catch up on the blocks mined
  during PC1's absence. No data loss — just a display delay.
- **A few seconds of relayer overlap** between PC2's stack starting and
  PC1's actually dying: the non-atomic claim leaves a residual
  double-mint risk — to be fixed eventually with an
  `.eq('status','pending')` condition on the Supabase update.
- **Bridge keys compromised in git history**: the `.env` /
  `*_keys.json` files were committed then untracked — GitHub history
  still contains them. Vault key rotation recommended.

---

## 6. Quick troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| `connection failed ws://<PC1>:6001` | PC1 down or port closed | normal in failover; else firewall/Tailscale |
| Node not mining during failover | `isSyncing` still true | wait for sync to finish (by design) |
| Relayers 502 via tunnel | containers not on `quantix-universal-net` | `docker network ls`, recreate the network |
| `Invalid State Root` looping | corrupted state (rare) | wipe `node/data/` + resync |
| Duplicate container names | stack started by hand while watchdog ran | `docker compose -f docker-compose-failover.yml --profile failover stop` |
