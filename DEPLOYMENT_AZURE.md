# Deployment Guide: Microsoft Azure

This guide explains how to deploy your Quantix node on **Microsoft Azure**, using the Free Account eligibility.

## 1. Prerequisites

*   A **Microsoft Azure** account.
*   (Preferred) An SSH Public Key ready (e.g., `id_rsa.pub`).

---

## 2. Create the Virtual Machine

1.  Log in to the **Azure Portal**.
2.  Search for **Virtual Machines** and click **Create** > **Azure virtual machine**.
3.  **Project Details**:
    *   **Subscription**: Azure Subscription 1 (Free Trial).
    *   **Resource Group**: Create new (e.g., `QuantixGroup`).
4.  **Instance Details**:
    *   **Virtual machine name**: `quantix-node-azure`
    *   **Region**: (US) East US (or another region with free tier availability).
    *   **Image**: **Ubuntu Server 22.04 LTS**.
    *   **Size**: `Standard_B1s` (1 vCPU, 1 GiB memory) - *Eligible for free services*.
5.  **Administrator account**:
    *   **Authentication type**: SSH public key.
    *   **Username**: `azureuser`.
    *   **SSH public key source**: Use existing or generate new key pair.

---

## 3. Configure Firewall (Networking)

Azure uses **Network Security Groups (NSG)** to control traffic.

1.  In the creation wizard, go to the **Networking** tab.
2.  **NIC network security group**: Select **Advanced** (This allows us to create specific rules).
3.  Click **Create new** under "Configure network security group".
4.  **Add Inbound Rule** (Port 3001):
    *   **Source**: Any
    *   **Source port ranges**: *
    *   **Destination**: Any
    *   **Service**: Custom
    *   **Destination port ranges**: `3001`
    *   **Protocol**: TCP
    *   **Action**: Allow
    *   **Name**: `AllowQuantixAPI`
5.  **Add Inbound Rule** (Port 6001):
    *   **Source**: Any
    *   **Destination port ranges**: `6001`
    *   **Protocol**: TCP
    *   **Name**: `AllowQuantixP2P`
6.  Ensure **SSH (22)** is also allowed.
7.  Click **OK** and proceed to **Review + create**.

---

## 4. Connect via SSH

1.  Open your terminal.
2.  Connect using the username `azureuser` and your key:
    ```bash
    ssh -i key.pem azureuser@YOUR_PUBLIC_IP
    ```

---

## 5. Install & Run Quantix Node

Run these commands on your Azure VM:

```bash
# 1. Install Docker & Tools
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git nano
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
    Go to `http://YOUR_PUBLIC_IP:3001/blocks`
    *(Find your Public IP in the "Overview" section of the VM)*.

---

## 7. Troubleshooting

**"Connection Timeout"**:
*   Go to your VM resource > **Networking** (left sidebar).
*   Check the **Inbound port rules**.
*   Make sure you see `AllowQuantixAPI` (3001) and `AllowQuantixP2P` (6001).
