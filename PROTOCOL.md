# Quantix Protocol — Technical Documentation

How the chain actually works, as implemented in `src/`.

## Why "quantum resistant"

Bitcoin and Ethereum sign transactions with ECDSA on elliptic curves. A
sufficiently large quantum computer running **Shor's algorithm** breaks
ECDSA — anyone's coins can be stolen once their public key is visible
(which, on most chains, is every address that has ever spent). This also
enables *harvest now, decrypt later*: signed data exposed today becomes
forgeable the day the hardware catches up.

Quantix replaces ECDSA with **ML-DSA** (CRYSTALS-Dilithium), the lattice-
based signature scheme standardized by NIST as **FIPS-204** (August 2024).
Lattice problems are not known to be vulnerable to Shor's algorithm —
that is the entire point of the NIST post-quantum standardization process.

| Classical chains | Quantix |
|---|---|
| ECDSA secp256k1 — broken by Shor | **ML-DSA-65** (FIPS-204, security level 3) |
| Address = hash of pubkey | Address **is** the pubkey (3904 hex chars) |
| ~64-byte signatures | ~3.3 KB signatures (the price of PQ security) |

`src/wallet.ts` implements signing/verification through the vendored
`@noble/post-quantum` implementation (`src/noble/ml-dsa.js`), with support
for both ML-DSA-44 (level 2) and ML-DSA-65 (level 3). Level 3 is the
default (`DILITHIUM_LEVEL = 3`).

## Addresses and keys

- A wallet is a 32-byte seed → `ml_dsa65.keygen(seed)` → the **public key
  is the address** (no hashing, no base58 — addresses are ~1.9 KB of hex)
- The wallet file `node/wallet/private_key` stores the seed as
  `{"privateKey": "<hex>"}` — protect it like any private key
- Transactions sign each `txIn` independently with ML-DSA

## Consensus: Proof-of-Stake lottery

Quantix is a UTXO chain with a PoS selection rule — **not** PoW. There is
no nonce grinding: each minter gets exactly **one hash attempt per
timestamp tick** (`src/blockchain.ts::isBlockStakingValid`):

```
SHA256(prevHash + minterAddress + timestamp)  <  2^256 · balance / (difficulty + 1)
```

- Your chance to mint a block scales linearly with your **coin balance**
- Target block time: **300 s**, adjusted every **10 blocks** (clamped to
  ±4× per adjustment)
- Chain selection: the valid chain with the highest cumulative
  `Σ 2^difficulty` wins
- **Emergency rule**: if the chain produces no block for >1 hour,
  difficulty resets to 1 and only the genesis address may mint recovery
  blocks — a liveness failsafe, not a privilege (enforced by consensus)

Blocks carry a coinbase reward transaction to the minter. Genesis minted
100,000,000 QTX; current supply is queryable on `/totalSupply`.

## Hashing

SHA-256 (via crypto-js) for block hashes, tx ids and the staking lottery.
Hash functions are *not* threatened by Shor — Grover's algorithm gives at
best a quadratic speedup, leaving ~128-bit security, which is why only
the **signatures** needed replacing, not the hashes.

## Networking and sync

- **P2P over WebSocket** (`src/p2p.ts`), port `6001`, configurable via
  `PEERS` / `BOOT_NODES` env vars
- Blocks sync in **200-block chunks**; peers exchange a short tail of
  block headers (50) to find the sync point — explicitly capped messages
  (64 MB) because raw Dilithium headers are heavy
- New blocks propagate via `broadcastLatest`; the mempool propagates via
  `broadCastTransactionPool`

## Signed chain snapshots

To bootstrap a node in ~1 minute instead of replaying the whole chain:

- Nodes with `SNAPSHOT_EXPORT=true` periodically export a gzipped
  `blockchain.json` and sign `quantix-snapshot:{height}:{sha256}` with
  their ML-DSA wallet key (`src/snapshot.ts`)
- Served read-only on `/snapshot` + `/snapshot-meta`
- `src/tools/bootstrap-snapshot.js` verifies SHA-256 **and** the ML-DSA
  signature against the pinned operator key before writing
  `data/blockchain.json` — post-quantum authentication end to end

## HTTP API

Read-only endpoints are public-safe; anything mutating
(`mintBlock`, `sendTransaction`, `private-key`, `stop`…) is gated by
`checkSafeMode` → `SAFE_MODE=true` returns 403. The API binds to
localhost in all provided compose files — **never expose a wallet API
publicly**.

Key endpoints: `/info`, `/debug`, `/block/:hash`, `/blocks/:from/:to`,
`/address/:address`, `/balance/:address`, `/transaction/:id`,
`/snapshot`, `/snapshot-meta`.

## Honest limitations

- **Small validator set** — today the network is operated by a handful of
  nodes; the more public nodes join, the more decentralized the lottery
- **Timestamp entropy** — the PoS lottery uses `timestamp` as its only
  entropy source per round, which is standard for this class of PoS but
  means an adversary can grind timestamps within the acceptance window
- **ML-DSA signature size** (~3.3 KB vs ~64 B ECDSA) makes blocks and
  headers heavy — the reason sync is chunked and snapshots exist
- The codebase is compact and deliberately readable — it is not yet a
  formally audited implementation

## Repository map

| File | Role |
|---|---|
| `src/blockchain.ts` | consensus, chain validation, persistence |
| `src/p2p.ts` | WebSocket P2P protocol, chunked sync |
| `src/wallet.ts` | ML-DSA keys, transaction creation |
| `src/transaction.ts` | UTXO model, txIn signing |
| `src/transactionPool.ts` | mempool |
| `src/snapshot.ts` | signed snapshot export |
| `src/tools/bootstrap-snapshot.ts` | client-side snapshot verifier |
| `src/main.ts` | HTTP API, mining loop, bootstrap |
