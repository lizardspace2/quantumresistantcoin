# Quantix Core (Proof-of-Stake)

Quantix is a lightweight, Proof-of-Stake (PoS) blockchain implementation geared towards scalability and ease of deployment.

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
