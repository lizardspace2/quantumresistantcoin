# Deployment Guide: Oracle Cloud Infrastructure (OCI)

This guide is specific to **Oracle Cloud** (Always Free Tier), which requires extra networking steps compared to other providers.

## 1. Prerequisites

*   An **Oracle Cloud** account.
*   (Recommended) Use the **Ampere A1 (ARM)** instance if available (4 OCPU, 24GB RAM are free). If not, use the **AMD E2.1.Micro**.

---

## 2. Create the VM Instance

1.  Log in to OCI Console.
2.  Go to **Compute** -> **Instances** -> **Create Instance**.
3.  **Name**: `quantix-node-oracle`
4.  **Image and Shape**:
    *   **Image**: Canonical Ubuntu 22.04.
    *   **Shape**: `VM.Standard.A1.Flex` (ARM) or `VM.Standard.E2.1.Micro` (AMD).
5.  **Networking**:
    *   Select "Create new virtual cloud network" (or use existing).
    *   Select "Assign a public IPv4 address".
6.  **SSH Keys**: Save your Private Key safely!
7.  Click **Create**.

---

## 3. Configure Cloud Firewall (Security List)

You must open ports in the Oracle Cloud VCN (Virtual Cloud Network).

1.  Click on your new **Instance Name**.
2.  Click on the **Subnet** link (e.g., `subnet-2023...`).
3.  Click on the **Default Security List** for that subnet.
4.  Click **Add Ingress Rules**.
5.  **Source CIDR**: `0.0.0.0/0`
6.  **Destination Port Range**: `3001,6001` (Enter them separately if needed).
    *   Rule 1: TCP Port `3001` (API)
    *   Rule 2: TCP Port `6001` (P2P)
7.  Click **Add Ingress Rules**.

---

## 4. Configure Host Firewall (CRITICAL STEP)

**⚠️ Unlike other clouds, Oracle Ubuntu images have a strict firewall (iptables) enabled by default inside the VM.** Even if you open the VCN (Step 3), traffic will be blocked here if you skip this.

1.  **SSH** into your VM:
    ```bash
    ssh -i key.key ubuntu@YOUR_PUBLIC_IP
    ```

2.  **Run these commands** to open the ports:

    ```bash
    # Open Port 3001 (API)
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT

    # Open Port 6001 (P2P)
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 6001 -j ACCEPT

    # Save changes so they persist after reboot
    sudo netfilter-persistent save
    ```

    *Note: If `netfilter-persistent` is not installed, install it: `sudo apt update && sudo apt install -y iptables-persistent`.*

---

## 5. Install & Run Quantix Node

Now deploy the node using Docker.

```bash
# 1. Install Docker & Tools
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git nano iptables-persistent
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 2. Clone Repository
git clone https://github.com/lizardspace2/Quantix-Core.git
cd Quantix-Core

# 3. Start Peer Node
sudo docker compose -f docker-compose-peer.yml up -d --build
```

---

## 6. Verification

1.  **Check Logs**:
    ```bash
    sudo docker compose -f docker-compose-peer.yml logs -f
    ```
2.  **Check Browser**:
    Open `http://YOUR_PUBLIC_IP:3001/blocks`

    *If it keeps loading forever:*
    *   Re-check **Step 3** (VCN Security List).
    *   Re-check **Step 4** (iptables command).
