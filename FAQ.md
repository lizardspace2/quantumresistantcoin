# Quantix — Questions & Answers

Everything you might ask, answered honestly — from "why does this exist"
to "where does my key live".

## The project

**What is Quantix?**
A lightweight Proof-of-Stake blockchain where every transaction is signed
with a post-quantum signature scheme (ML-DSA / CRYSTALS-Dilithium, FIPS-204)
instead of ECDSA. The node is a small, readable TypeScript codebase that
runs in Docker with two commands.

**Why does quantum resistance matter now?**
Two reasons. *Harvest now, decrypt later*: adversaries can already record
today's signatures and forge them once hardware catches up. And on most
chains, your public key becomes visible the moment you spend — so "we'll
upgrade later" is not a defense. Quantix starts from a signature scheme
designed to survive Shor's algorithm.

**Is it really quantum-proof?**
ML-DSA is the scheme NIST standardized (FIPS-204, August 2024)
specifically for post-quantum security — no efficient quantum attack on
module lattices is known. Hashing stays SHA-256, which Grover's algorithm
only weakens to ~128-bit security: fine. That said, the implementation
itself is not formally audited — treat it accordingly.

**Is this a real blockchain or a demo?**
A live chain with real blocks (~24k at last check), real ML-DSA
signatures, a public P2P seed, and production infrastructure
(tunnels, failover, signed snapshots). It's small and young — the
"honest limitations" in [PROTOCOL.md](PROTOCOL.md) apply.

**Is the code open source?**
Yes — Apache-2.0, on GitHub at
`lizardspace2/quantumresistantcoin`. Small enough to read end-to-end,
which is deliberate: you can audit your own money's consensus rules.

**What does the ecosystem look like?**
Beyond this node repo there's a wallet/key-forge app, an explorer,
a faucet, a shield app, and a bridge that wraps QTX onto Solana, Polygon
and Stellar (wQTX). The bridge uses its own signed claim proofs — the
same "verify, don't trust" pattern as the snapshots here.

## Keys, addresses, coins

**Why is my address ~3,900 characters long?**
Because your address *is* your raw ML-DSA-65 public key (1,952 bytes of
hex) — no hashing, no base58. PQ public keys are simply big; that's the
cost of the security.

**How big are signatures?**
~3.3 KB per signature vs ~64 bytes for ECDSA. It's why block headers are
heavy, sync is chunked in 200-block messages, and signed snapshots exist.

**Why ML-DSA and not Falcon or SPHINCS+?**
ML-DSA-65 (NIST security level 3) is the best balance of security margin
and usability. Falcon signatures are smaller but far harder to implement
safely (floating-point arithmetic is a side-channel minefield). SPHINCS+
is hash-based and conservative but produces even larger signatures and is
slow. Both alternatives stay available in `src/noble/` (`ml_dsa44` for
level 2 is already supported by the verifier).

**Could a quantum computer forge an old transaction?**
Not realistically — every signature in the chain is ML-DSA. There is no
ECDSA anywhere in the consensus path to attack retroactively.

**Is my key generation quantum-safe?**
The seed is 32 bytes from `crypto.randomBytes` — OS-level CSPRNG. 256-bit
classical entropy is beyond any brute force, quantum or not.

**Where is my private key?**
`node/wallet/private_key` — a 32-byte seed as `{"privateKey": "<hex>"}`.
Back it up, protect it, never commit it. If you lose it, the coins are
gone; if you leak it, they're not yours anymore.

**How are coins created? Is there a max supply?**
Each block pays the minter a coinbase reward of **50 QTX, halving every
100,000 blocks** (Bitcoin-style schedule, `getCoinbaseAmount`), plus the
transaction fees in that block. Genesis allocated 100,000,000 QTX. The
subsidy converges asymptotically — live supply on `/totalSupply`.

**Are there transaction fees?**
Yes — fees are `sum(inputs) − sum(outputs)`, validated by the node (there
is a minimum fee), and paid to the minter inside the coinbase.

## Consensus & mining

**Proof-of-Stake or Proof-of-Work?**
PoS — there's no nonce grinding. Each minter gets one lottery ticket per
timestamp tick: `SHA256(prevHash + address + timestamp)` must be below a
target proportional to your balance. More balance → better odds.

**Can I mine? Do I need a stake?**
`ENABLE_MINING=true` starts the mining loop. A non-zero balance improves
your odds (below block 1,000,000 even a zero balance gets a small boost).
Realistically you need some QTX to win regularly.

**How fast are blocks?**
Target: 300 s, difficulty self-adjusts every 10 blocks. If the chain
stalls >1 hour, difficulty resets to 1 and the genesis address can mint
recovery blocks — a liveness failsafe built into consensus.

**What stops me from faking a huge balance?**
Your balance comes from the UTXO set — every node recomputes it
independently. A block claiming an inflated `minterBalance` fails
`isBlockStakingValid` and is rejected.

**Isn't the genesis "recovery" rule a backdoor?**
It's a trade-off, documented as such: it exists so the chain can't die
permanently from a liveness failure, and it's restricted to *emergency*
blocks (chain stalled >1 h, difficulty 1) which every node can see. It
cannot mint normal blocks, move anyone's coins, or forge signatures.

**What if two miners mint a block at the same height?**
A fork — resolved like Bitcoin: nodes keep the chain with the highest
cumulative `Σ 2^difficulty`. Short forks resolve themselves within a few
blocks as one branch pulls ahead.

## Networking

**How do nodes find each other?**
Via `PEERS` / `BOOT_NODES` WebSocket URLs. The public quickstart points at
the maintained seed `wss://p2p.quantumresistantcoin.com`; your own nodes
can peer directly (`PEERS=ws://ip:6001`).

**Is P2P traffic encrypted?**
On the public seed yes — it goes through Cloudflare (`wss`, TLS). On a
LAN, plain `ws`. Block integrity doesn't depend on transport anyway:
every block is independently ML-DSA-verified, so a tampered connection
can't inject forged blocks — worst case it can withhold them.

**Can an attacker feed me a fake chain?**
They'd have to produce blocks that pass `isBlockStakingValid` with valid
ML-DSA signatures and UTXOs — i.e., genuinely win the lottery. A chain
full of garbage blocks fails validation regardless of its length.

**Can I run my own seed node for friends?**
Yes — any reachable node is a potential seed. Give them
`PEERS=ws://your-ip:6001` (or behind a tunnel for `wss`).

**Do I have to open ports?**
Inbound `6001` helps the network (peers can reach you), but it's optional:
outbound `wss` to the seed is enough to follow the chain — which is also
why a phone on 4G works.

## Running a node

**What's the fastest way to run one?**
Two commands — see [README → Run a node](README.md#-run-a-node-docker).
The bootstrap downloads a signed snapshot (~5 MB), verifies it, and the
node catches up the last few blocks in about a minute.

**What are the resource requirements?**
~2 CPU / 2 GB RAM is comfortable (the compose limits). Disk ~500 MB.
During initial chain verification expect one CPU core busy — that's
ML-DSA verification doing its job.

**Does it run on Windows / macOS / ARM?**
The compose quickstart runs anywhere Docker runs (this project is
developed on Windows). The GHCR image is currently built for `amd64`;
on ARM (Raspberry Pi, Apple Silicon) either let Docker emulate it
(slower) or run from source with `npm install && npx tsc && node
src/main.js` — pure JS, no native deps. Termux on Android is the same
path ([MOBILE.md](MOBILE.md)).

**Can I run several nodes on one machine?**
Yes — separate data directories and separate host ports
(`HTTP_API_PORT`, `P2P_HOST_PORT` env vars, or a second checkout). They
can peer with each other or all follow the public seed.

**How do I move my node to another machine?**
Copy `node/wallet/private_key` (that's your money) and — optionally —
`data/` to skip resyncing. Without `data/`, the bootstrap rebuilds the
chain in ~1 minute anyway.

**How do I back up my node?**
The only irreplaceable file is `node/wallet/private_key`. Everything
else is reconstructible from the network.

**Can I mine and expose my API?**
Don't. `SAFE_MODE=true` turns every mutating endpoint into a 403, and the
compose files bind the API to `127.0.0.1` only. A public wallet API is an
open wallet.

**Bare metal without Docker?**
`npm install && npx tsc && node src/main.js` with the same env vars —
pure JS, zero native modules. See [MOBILE.md](MOBILE.md) for the same
flow on Android.

## Snapshots & sync

**What is the snapshot, and why trust it?**
The operator periodically publishes a gzipped copy of the chain plus a
metadata file signed with its ML-DSA key. Your bootstrap verifies
SHA-256 *and* the signature against the operator's pinned public key
(`SNAPSHOT_SIGNER` in `docker-compose.public.yml`) — a forged snapshot
is refused before it ever touches your disk.

**What if the snapshot server is down?**
Nothing breaks: the bootstrap fails, the node falls back to normal P2P
sync (slower, still fully verified). You can also point `SNAPSHOT_URL`
at any node that exports snapshots.

**Does the snapshot reduce security?**
No — it's an optimization, not a trust shortcut. The chain you download
is validated by the node on load (genesis hash, every transaction's
UTXO validity), and ongoing sync still verifies every block's ML-DSA
signatures and staking lottery.

**How fresh is the snapshot?**
Exported every 6 hours by default — worst case ~360 blocks to catch up,
which is seconds of sync.

**Can I make my node serve snapshots too?**
`SNAPSHOT_EXPORT=true` (+ optional `SNAPSHOT_INTERVAL_MINUTES`) on a node
that has a wallet key, then share `https://your-host/snapshot` — your
users pin *your* public key as `SNAPSHOT_SIGNER`.

## Troubleshooting

| Problem | Answer |
|---|---|
| `Max payload size exceeded` | Old image — `docker compose pull` (fixed: headers are capped + 64 MB limit) |
| `blockchain.json` corrupt after kill | `rm data/blockchain.json`, restart — the bootstrap re-seeds it |
| `isSyncing: true` forever | Check `/debug` height climbs; if stuck, check `PEERS` reaches a seed |
| Port already in use | `HTTP_API_PORT=xxxx P2P_HOST_PORT=xxxx docker compose -f docker-compose.public.yml up -d` |
| Node eats CPU while syncing | Normal — ML-DSA verify is CPU work; it settles at the tip |
| `denied: permission_denied` on GHCR | `docker logout ghcr.io`, then pull again — the image is public |
| Container restarts in a loop | `docker logs quantix-node` — usually a corrupt chain file (see above) or an unreadable wallet dir |

## Development

**What language / stack?**
TypeScript on Node 18, Express HTTP API, `ws` P2P, `@noble/post-quantum`
ML-DSA. No native modules — deliberately portable.

**How do I build from source?**
`npm install && npx tsc` — the Dockerfile does exactly this.

**How do I contribute or report a bug?**
Issues and PRs on the GitHub repo. The codebase is small enough that
"read the function, fix the function" is a realistic workflow.

**Can I run a private/test chain?**
The genesis parameters are hardcoded (`GENESIS_BLOCK_HASH` in
`src/blockchain.ts`) — a private chain means editing the genesis block
and keeping your nodes on their own `PEERS` set. Doable for experiments,
just keep it off the public seed.

## Going deeper

- [PROTOCOL.md](PROTOCOL.md) — signatures, lottery math, sync internals
- [TUTO.md](TUTO.md) — full HA setup (failover, tunnels, relayers)
- [MOBILE.md](MOBILE.md) — Termux node on Android
- `curl http://localhost:3001/debug` — your node's own status
