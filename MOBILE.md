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
> That said — yes, a full post-quantum blockchain node in your pocket is
> fun, and it works because every dependency of Quantix is pure JS.

## What you need

- An **Android** phone (iOS can't run this — no viable Node.js runtime)
- **Termux** installed from **F-Droid** (the Play Store build is outdated and broken)
- ~1 GB free storage and a phone with ≥4 GB RAM recommended
- Wi-Fi + charger (first sync is CPU-heavy — Dilithium signature verification)

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
(~5 MB), same as the Docker quickstart:

```bash
node src/tools/bootstrap-snapshot.js
```

It verifies SHA-256 + the operator's ML-DSA signature before writing
`data/blockchain.json`. To pin the signer key explicitly (better):

```bash
SNAPSHOT_SIGNER=$(grep -o 'SNAPSHOT_SIGNER:-[0-9a-f]*' docker-compose.public.yml | cut -d: -f2) \
  node src/tools/bootstrap-snapshot.js
```

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

Then check it (new Termux session — swipe from left edge → "New session"):

```bash
curl http://localhost:3001/debug
# {"height": 2399x, "isSyncing": false, "peers": [...]}
```

## Limits — read this

- **Follower only.** Keep `ENABLE_MINING=false`. Mining spins the CPU at
  100% — on a phone that means heat, thermal throttling and a dead battery.
- **Backgrounding** needs `termux-wake-lock` AND disabling Android battery
  optimization for Termux (system settings). Even then, Android may
  eventually kill it. A node that gets killed is not a reliable peer.
- **No inbound peers on mobile data** — NAT/CGNAT blocks them. Your node
  connects *out* to the seed, which is enough to follow the chain.
- **Boot RAM**: loading the chain is a ~193 MB `JSON.parse` → ~1 GB heap
  spike. On ≤3 GB phones it may OOM; try
  `NODE_OPTIONS=--max-old-space-size=2048` in front of `node src/main.js`.
- **Storage**: the chain is ~200 MB and grows; the node rewrites it
  periodically (mild flash wear).
- **Stopping**: `termux-wake-unlock` after Ctrl+C.

## When you get bored of the fun part

The same node on a PC takes two commands, survives reboots, accepts
inbound peers and can mine for real rewards:
[README → Run a node](README.md#-run-a-node-docker)
