# Quantix — Questions & Answers

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

## Keys, addresses, coins

**Why is my address ~3,900 characters long?**
Because your address *is* your raw ML-DSA-65 public key (1,952 bytes of
hex) — no hashing, no base58. PQ public keys are simply big; that's the
cost of the security.

**How big are signatures?**
~3.3 KB per signature vs ~64 bytes for ECDSA. It's why block headers are
heavy, sync is chunked in 200-block messages, and signed snapshots exist.

**How are coins created?**
A coinbase transaction in each block pays the minter. Genesis allocated
100,000,000 QTX; check the live supply on any node's `/totalSupply`.

**Where is my private key?**
`node/wallet/private_key` — a 32-byte seed as `{"privateKey": "<hex>"}`.
Back it up, protect it, never commit it. If you lose it, the coins are
gone; if you leak it, they're not yours anymore.

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

## Running a node

**What's the fastest way to run one?**
Two commands — see [README → Run a node](README.md#-run-a-node-docker).
The bootstrap downloads a signed snapshot (~5 MB), verifies it, and the
node catches up the last few blocks in about a minute.

**Do I have to open ports?**
Inbound `6001` helps the network (peers can reach you), but it's optional:
outbound `wss` to the seed is enough to follow the chain — which is also
why a phone on 4G works.

**What are the resource requirements?**
~2 CPU / 2 GB RAM is comfortable (the compose limits). Disk ~500 MB.
During initial chain verification expect one CPU core busy — that's
ML-DSA verification doing its job.

**Can I run a node on a phone?**
Yes, via Termux — see [MOBILE.md](MOBILE.md). Fun, works, but a PC is
strictly better (battery, backgrounding, no inbound peers on mobile).

**Can I mine and expose my API?**
Don't. `SAFE_MODE=true` turns every mutating endpoint into a 403, and the
compose files bind the API to `127.0.0.1` only. A public wallet API is an
open wallet.

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

## Troubleshooting

| Problem | Answer |
|---|---|
| `Max payload size exceeded` | Old image — `docker compose pull` (fixed: headers are capped + 64 MB limit) |
| `blockchain.json` corrupt after kill | `rm data/blockchain.json`, restart — the bootstrap re-seeds it |
| `isSyncing: true` forever | Check `/debug` height climbs; if stuck, check `PEERS` reaches a seed |
| Port already in use | `HTTP_API_PORT=xxxx P2P_HOST_PORT=xxxx docker compose -f docker-compose.public.yml up -d` |
| Node eats CPU while syncing | Normal — ML-DSA verify is CPU work; it settles at the tip |

## Going deeper

- [PROTOCOL.md](PROTOCOL.md) — signatures, lottery math, sync internals
- [TUTO.md](TUTO.md) — full HA setup (failover, tunnels, relayers)
- [MOBILE.md](MOBILE.md) — Termux node on Android
- `curl http://localhost:3001/debug` — your node's own status
