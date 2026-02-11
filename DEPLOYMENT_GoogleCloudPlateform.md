# Deployment Guide: Quantix (QTX) on Google Cloud Platform (GCP)

This guide details step-by-step how to deploy your Quantix node on the Google Cloud Platform Free Tier.

## Introduction: Node Types

Before starting, it is important to understand which type of node you are deploying:

*   **Standard Node (Peer)**: This is what 99% of users will deploy. It connects to the network, syncs the blockchain, and can mine blocks if it has a balance. It generates its own unique identity (wallet) automatically.
*   **Genesis Node (Bootnode)**: This is the specific node that created the network and holds the initial 100 million coin supply. **You do not need to follow Genesis instructions unless you are re-deploying the network root.**

---

## 1. Creating the Virtual Machine (VM)

The GCP Free Tier includes an `e2-micro` instance in specific regions.

1.  Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Go to **Compute Engine** > **VM instances**.
3.  Click on **Create Instance**.
4.  **Important Configuration (for free tier):**
    *   **Name**: `quantix-node`
    *   **Region**: Choose `us-central1`, `us-west1` or `us-east1` (Only these regions are eligible for the Free Tier).
    *   **Machine type**: `e2-micro` (2 vCPU, 1 GB memory).
    *   **Boot disk**: Click "Change".
        *   Operating System: **Ubuntu** (Choose version `22.04 LTS` or `20.04 LTS`).
        *   Disk type: **Standard persistent disk**.
        *   Size: **30 GB** (Maximum included in the free tier).
5.  **Firewall**:
    *   Check "Allow HTTP traffic".
    *   Check "Allow HTTPS traffic".
6.  Click **Create**.

## 2. Firewall Configuration (Opening Ports)

Your node needs to communicate with the world. By default, Google Cloud blocks most connections. We need to open two specific ports:

*   **Port 3001 (HTTP API)**: Used to query your node (e.g., getting your balance, checking block height).
*   **Port 6001 (P2P WebSocket)**: Used by the node to talk to other nodes (peers) to receive new blocks and transactions.

### Option A: Using `gcloud` (Recommended)

Run this command in your Cloud Shell:

```bash
gcloud compute firewall-rules create allow-quantix-ports \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:3001,tcp:6001 \
    --source-ranges=0.0.0.0/0

    # (Conditional) If you use GCP Cloud Shell or IAP for SSH, you might need to allow Google's range:
    gcloud compute firewall-rules create allow-ssh-ingress-from-iap \
    --direction=INGRESS \
    --action=ALLOW \
    --rules=tcp:22 \
    --source-ranges=35.235.240.0/20
```

### Option B: Using GCP Console

1.  In the console, search for "Firewall policies" or go to **VPC network** > **Firewall**.
2.  Click **Create Firewall Rule**.
3.  **Name**: `allow-quantix-ports`
4.  **Targets**: `All instances in the network`
5.  **Source IP ranges**: `0.0.0.0/0` (Allows everyone to connect).
6.  **Protocols and ports**:
    *   Check `tcp` and enter: `3001,6001`
7.  Click **Create**.

---

## 3. Node Installation and Launch

1.  Return to **Compute Engine** > **VM instances**.
2.  Click the **SSH** button next to your instance to open a terminal in your browser.
3.  Run the following commands one by one:

### A. Install Docker and Git

We use Docker to run the node in a contained, consistent environment.

```bash
# 1. Update and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git nano

# 2. Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 3. Configure the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 5. Verify that Docker works
sudo docker run hello-world
```

### B. Configure and Launch the Node

1.  **Clone the Repository**
    Download the latest version of the code to your server.
    ```bash
    git clone https://github.com/lizardspace2/quantumresistantcoin.git
    cd quantumresistantcoin
    ```

2.  **Launch the Standard Node**
    We use the `docker-compose-peer.yml` configuration. This file is specifically designed for standard nodes.
    
    *What does this configuration do?*
    *   **Auto-Wallet**: It immediately generates a secure, post-quantum private key (`node/wallet/private_key`) if one doesn't exist.
    *   **Data Persistence**: It maps the internal `data` folder to your server's storage, so you don't lose the blockchain if you restart.
    *   **Auto-Connect**: It enables the P2P module to find the network bootnodes.

    Run the launch command:
    ```bash
    sudo docker compose -f docker-compose-peer.yml up -d --build
    ```

    *   `-d`: Detached mode (runs in background).
    *   `--build`: Compiles the latest code from source.

## 4. Verification

Once the command finishes, your node is running. Let's verify it.

### 1. Check the Logs
See what the node is doing in real-time.
```bash
sudo docker compose -f docker-compose-peer.yml logs -f
```
**What to look for:**
*   `New wallet initialized.` (First run only)
*   `Connect to peers: ws://34.58.38.118:6001...` (Connection to Bootnode)
*   `received block: ...` (Syncing with the network)

(Press `Ctrl + C` to exit logs)

### 2. Check the API
Find your VM's **External IP** in the Google Cloud Console.
Open your browser and visit: `http://YOUR_EXTERNAL_IP:3001/info`

You should see a JSON response like:
```json
{
  "height": 12,
  "latestHash": "...",
  "totalSupply": 100000000
}
```
If `height` matches the explorer, your node is fully synced!

## 5. IMPORTANT: Backup Your Key

Your node has generated a unique private key. **If you lose this key, you lose access to any coins this node mines or receives.**

### To see your address:
```bash
curl http://localhost:3001/address
```

### To backup your key:
The key is stored in `~/quantumresistantcoin/node/wallet/private_key`.

1.  **Display the key content (Be careful, do not share this!)**:
    ```bash
    cat ~/quantumresistantcoin/node/wallet/private_key
    ```
2.  **Copy the output** and save it securely (e.g., in a password manager).
3.  **Alternative (Download)**:
    In the SSH window, click the **Gear Icon** > **Download File**.
    Enter the path: `/home/YOUR_USERNAME/quantumresistantcoin/node/wallet/private_key`
    (Type `pwd` to find your full username path if unsure).

## 6. Maintenance Commands

**Stop the node:**
```bash
sudo docker compose -f docker-compose-peer.yml down
```

**Restart the node:**
```bash
sudo docker compose -f docker-compose-peer.yml restart
```

**Update the software:**
```bash
# 1. Get latest code
git pull

# 2. Rebuild and restart
sudo docker compose -f docker-compose-peer.yml up -d --build
```

---

# APPENDIX: Genesis Node Deployment (Network Creators Only)

**WARNING**: This section is ONLY for the administrator deploying the network root. Do not follow these steps for a standard node.

The Genesis Node requires a specific pre-generated key (`genesis_key.json`) that controls the initial 100M supply.

### 1. Setup
Follow the main guide up to **Step 3.B.1** (Cloning the repo). Do not launch the node yet.

### 2. Import Genesis Key
You must upload your local `genesis_key.json` to the server.
1.  In the SSH Browser window, click **Upload File** (Gear icon).
2.  Select `genesis_key.json`.
3.  Move it to the expected location:
    ```bash
    # The production config expects the key at the root of the project to mount it
    mv ~/genesis_key.json ~/quantumresistantcoin/
    ```

### 3. Launch Genesis Node
Use the `docker-compose.prod.yml` file, which is hardcoded to mount `genesis_key.json`.

```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Verification
Check that the node has loaded the correct address (the one with 100M coins).
```bash
curl http://localhost:3001/balance
```
It should return `100000000`.

---

## 7. Troubleshooting

If your node is not connecting or syncing, try these steps.

### A. Node Not Connecting to Peers
If `curl http://localhost:3001/peers` returns `0` or fails:

1.  **Check Firewall**: Verify ports 3001 and 6001 are open.
    ```bash
    # Run this in Cloud Shell
    gcloud compute firewall-rules describe allow-quantix-ports
    ```
2.  **Test Connectivity**: Log into your node and try to reach the bootnode.
    ```bash
    # Install net-tools if needed: sudo apt install netcat
    nc -zv 35.225.236.73 6001
    ```
    If this fails, the firewall is closed.

3.  **Force Reconnection**: Sometimes docker containers get stuck with stale network state.
    ```bash
    sudo docker compose -f docker-compose-peer.yml down
    sudo docker compose -f docker-compose-peer.yml up -d
    ```

### B. "Command npm not found" or Code Not Updating
If `git pull` doesn't update your running node:

1.  **Docker Build Required**: You cannot run `npm` directly on the server. You must rebuild the Docker image.
    ```bash
    git pull
    sudo docker compose -f docker-compose-peer.yml up -d --build
    ```

### C. Check Logs for Errors
```bash
sudo docker compose -f docker-compose-peer.yml logs --tail 50 -f
```
Look for `connection failed` or `EADDRINUSE` (port conflict).
