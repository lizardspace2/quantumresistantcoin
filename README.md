# Quantix Core (Proof-of-Stake)

Quantix is a lightweight, **post-quantum**, Proof-of-Stake (PoS) blockchain
implementation geared towards scalability and ease of deployment.

Transactions are signed with **ML-DSA (CRYSTALS-Dilithium, FIPS-204)** —
the lattice-based signature scheme NIST standardized to resist quantum
computers — instead of ECDSA, which Shor's algorithm breaks. Addresses
*are* ML-DSA public keys; consensus is a balance-weighted staking lottery.

📖 **[PROTOCOL.md](PROTOCOL.md)** — how the chain actually works: signatures,
PoS lottery, difficulty adjustment, P2P sync and signed snapshots.

❓ **[FAQ.md](FAQ.md)** — questions & answers: quantum resistance, mining,
snapshots, mobile nodes, troubleshooting.

**🌐 Official Webapp:** [www.quantumresistantcoin.com](https://www.quantumresistantcoin.com)

## ⚡ Run a node (Docker)

Requires [Docker](https://www.docker.com/products/docker-desktop/). One command — no repo clone, no build:

```bash
curl -O https://raw.githubusercontent.com/lizardspace2/quantumresistantcoin/main/docker-compose.public.yml
docker compose -f docker-compose.public.yml up -d
```

The node pulls the prebuilt image, then a `bootstrap` step downloads the
latest **signed chain snapshot** (~5 MB) from
`https://master.quantumresistantcoin.com/snapshot`, verifies its SHA-256
and its **ML-DSA-65 signature** against the operator's pinned public key,
and only then starts the node — which syncs the remaining few hundred
blocks in a couple of minutes instead of replaying the whole chain.

Trust anchor: the signature is verified against the operator's ML-DSA
public key (the genesis/master address) pinned as `SNAPSHOT_SIGNER` in
`docker-compose.public.yml`. A snapshot not signed by that key is refused.
To re-bootstrap an existing node: `SNAPSHOT_FORCE=true docker compose -f
docker-compose.public.yml up -d`.

```bash
docker logs -f quantix-node                 # watch the sync
curl http://localhost:3001/debug            # {"height": ..., "isSyncing": false}
```

**Notes**

- Runs as a **follower** by default. To mine: `ENABLE_MINING=true docker compose -f docker-compose.public.yml up -d`
- The HTTP API is bound to `127.0.0.1` only — never expose it publicly (it is a wallet API)
- Port `6001` must be reachable for inbound peers; change host ports with `HTTP_API_PORT` / `P2P_HOST_PORT`
- From inside the repo, `docker compose -f docker-compose.public.yml up -d --build` builds from source instead of pulling
- To run your own HA failover node (watchdog + tunnels + relayers), see [TUTO.md](TUTO.md)
- Feeling adventurous? You can even run a node on an **Android phone** via Termux — see [MOBILE.md](MOBILE.md) (fun, but a PC is better)

## 🚀 Deployment

We provide detailed guides for deploying Quantix nodes across various cloud providers, with a primary focus on Google Cloud Platform.

### 🌟 Recommended: Google Cloud Platform (GCP)
For the best experience and to utilize the Free Tier, follow our comprehensive GCP guides:

1.  **[Deployment Guide (GCP)](DEPLOYMENT_GoogleCloudPlateform.md)**
    *   Full step-by-step instructions to set up your first Genesis node or Peer node on Google Cloud.
    *   Includes VM creation, firewall configuration, and Docker setup.

2.  **[Operations & Maintenance (GCP)](GoogleCloudPlateform_OPS_TUTORIAL.md)**
    *   Advanced topics for running a stable node.
    *   **Static IP**: How to reserve a fixed IP address.
    *   **Backups**: managing disk snapshots.
    *   **Monitoring**: Tracking CPU and network usage.

### Other Cloud Providers
*   [Amazon Web Services (AWS)](DEPLOYMENT_AWS.md)
*   [Microsoft Azure](DEPLOYMENT_AZURE.md)
*   [DigitalOcean](DEPLOYMENT_DIGITALOCEAN.md)
*   [Oracle Cloud](DEPLOYMENT_ORACLE_CLOUD.md)

### Node Types
*   **Genesis Node**: The first node in the network (see GCP guide).
*   **[Peer Nodes](DEPLOYMENT_PEER.md)**: Additional nodes to decentralize the network.

---

## 🛠 Usage & API

Once your node is running, you can interact with it using the HTTP API.
*   **[API Cheat Sheet](API_CHEAT_SHEET.md)**: A collection of useful `curl` commands for checking balances, sending transactions, and monitoring the chain.

## ⚠️ Troubleshooting

If you encounter issues during deployment or synchronization:
*   See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for common fixes.
