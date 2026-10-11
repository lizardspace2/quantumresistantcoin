# 📱 Run a Quantix node on your phone (for fun)

> **Honest disclaimer first: a PC is better. Much better.**
>
> A phone node works, but it is a demo, not infrastructure. It will burn
> battery, Android will try to kill it, it can't accept inbound peers on
> mobile data, and mining on a phone is a bad idea (heat + battery). If
> you want a node that actually helps the network and stays up 24/7, use
> the [2-command Docker quickstart](README.md#-run-a-node-docker) on a PC
> instead — it is also genuinely *easier*.
>
> That said — yes, a full **post-quantum** blockchain node in your pocket
> is fun, and it works because every dependency of Quantix is pure JS
> (`@noble/post-quantum`, `crypto-js`, `express`, `ws` — zero native
> modules, nothing to compile).

## What you need

| Requirement | Why |
|---|---|
| **Android** phone | iOS can't run this — no viable Node.js runtime |
| **Termux** from **F-Droid** | the Play Store build is outdated and broken |
| ~1 GB free storage | chain is ~200 MB and grows |
| ≥4 GB RAM recommended | the chain load is a ~1 GB heap spike |
| Wi-Fi + charger for the first run | boot verification is CPU-heavy |

## 1. Set up Termux

```bash
pkg update && pkg upgrade -y
pkg install -y nodejs git
```

## 2. Get the node

```bash
git clone https://github.com/lizardspace2/quantumresistantcoin.git
cd quantumresistantcoin
npm install
npx tsc
mkdir -p data node/wallet
```

## 3. Fast bootstrap (recommended)

Skip ~30 minutes of full-chain verification — download the signed snapshot
(~5 MB → ~193 MB), same as the Docker quickstart:

```bash
node src/tools/bootstrap-snapshot.js
```

It verifies SHA-256 + the operator's **ML-DSA signature** before writing
`data/blockchain.json` — a forged snapshot is refused. To pin the signer
key explicitly (better):

```bash
SNAPSHOT_SIGNER=$(grep -o 'SNAPSHOT_SIGNER:-[0-9a-f]*' docker-compose.public.yml | cut -d: -f2) \
  node src/tools/bootstrap-snapshot.js
```

Skipping the bootstrap also works — the node then verifies the full chain
block by block, which on a phone means keeping it plugged in and warm for
a while.

## 4. Run the node (follower mode)

```bash
termux-wake-lock   # keeps Android from suspending the process

HTTP_PORT=3001 \
P2P_PORT=6001 \
SAFE_MODE=true \
ENABLE_MINING=false \
PEERS=wss://p2p.quantumresistantcoin.com \
node src/main.js
```

First boot loads the chain (~1 GB heap — may take 30-60 s on a phone),
then it connects to the public seed and syncs the last few blocks.

## 5. Watch it

Open a **second Termux session** (swipe from the left edge → *New session*):

```bash
curl http://localhost:3001/debug
# {"height": 2399x, "isSyncing": false, "peers": [{"url":"wss://...","height":2399x}]}
```

`isSyncing: false` and `height` matching the network tip = your phone is a
live follower of the chain.

## Keep it alive

- `termux-wake-lock` (done above) prevents CPU suspend while the screen is off
- Android settings → Apps → Termux → **Battery → Unrestricted** — otherwise
  Android will eventually kill the process anyway
- Stop cleanly: `Ctrl+C`, then `termux-wake-unlock` — this gives the node
  time to flush the chain to disk (killing it mid-write corrupts
  `data/blockchain.json`; if that happens just re-run the bootstrap)

## Update the node

```bash
cd quantumresistantcoin
git pull
npm install
npx tsc
# restart node — the chain data survives in data/
```

## Security notes

- The node creates a wallet key in `node/wallet/private_key`. A phone
  wallet is convenient, not a vault — **don't park real QTX on it**.
- `SAFE_MODE=true` is set above for a reason: it turns every mutating API
  endpoint (`sendTransaction`, `private-key`, `stop`…) into a 403. Keep it.
- The HTTP API binds to `0.0.0.0:3001` — reachable from your LAN. With
  SAFE_MODE it's read-only, but keep it off public Wi-Fi hotspots if you
  can.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Killed` / OOM at boot | Close other apps; retry with `NODE_OPTIONS=--max-old-space-size=2048` |
| `Cannot find module` | `npm install` again inside the repo |
| Stuck `isSyncing: true` | Normal during catch-up; watch `height` climb in `/debug` |
| Phone hot, battery draining | Expected during sync — it'll settle. If mining is on: turn it off |
| `data/blockchain.json` corrupt | `rm data/blockchain.json` + re-run the bootstrap |

## FAQ

**Can it mine?** Technically (`ENABLE_MINING=true`) — practically no: the
PoS lottery still costs continuous hashing, and you'd trade battery and
thermals for tiny odds against bigger balances.

**Does it work on 4G/5G?** For syncing, yes — outbound `wss` is enough.
Inbound peers can't reach you (CGNAT), so your phone follows the chain but
never serves it.

**How much data?** ~5 MB for the snapshot, then a trickle — blocks are
small and infrequent (~300 s target).

## When you get bored of the fun part

The same node on a PC takes two commands, survives reboots, accepts
inbound peers and can actually mint blocks:
[README → Run a node](README.md#-run-a-node-docker)

Want to understand what's running under the hood?
[PROTOCOL.md](PROTOCOL.md) — consensus, ML-DSA signatures, sync internals.
