# Deployment Guide: Amazon Web Services (AWS)

This guide details how to deploy your Quantix node on **AWS EC2**, utilizing the Free Tier.

## 1. Prerequisites

*   An **AWS Account**.
*   A terminal to use SSH (or Putty on Windows).

---

## 2. Launch the Instance (EC2)

1.  Log in to the **AWS Console**.
2.  Navigate to **EC2** > **Instances** > **Launch Instances**.
3.  **Name**: `quantix-node-aws`
4.  **OS Images**: Select **Ubuntu** (Ubuntu Server 22.04 LTS or 24.04 LTS).
5.  **Instance Type**: Select `t2.micro` or `t3.micro` (Free Tier usage eligible).
6.  **Key Pair (Login)**:
    *   Click **Create new key pair**.
    *   Name: `quantix-key`.
    *   Type: `RSA`.
    *   Format: `.pem` (for Mac/Linux/Windows 10+) or `.ppk` (for PuTTY).
    *   **Download the file** and keep it safe!

---

## 3. Configure Firewall (Security Group)

AWS uses "Security Groups" to manage ports. You must enable the Quantix ports.

1.  In the "Network settings" section (still in the Launch wizard), check "Create security group".
2.  **SSH**: Ensure "Allow SSH traffic from" is checked (Anywhere `0.0.0.0/0` or My IP).
3.  **Add Quantix Ports**:
    *   Currently, the wizard might restrict adding many rules. You can add them later, or edit now if "Edit" button is visible.
    *   **Recommendation**: Finish launching the instance first, then edit the Security Group.

**To Edit Security Group (After Launch):**
1.  Go to **EC2 Dashboard** > **Instances**.
2.  Click your instance ID.
3.  Click the **Security** tab -> Click the **Security Group ID** (sg-xxxx).
4.  Click **Edit inbound rules**.
5.  Add Rule 1:
    *   Type: `Custom TCP`
    *   Port range: `3001`
    *   Source: `Anywhere-IPv4` (`0.0.0.0/0`)
6.  Add Rule 2:
    *   Type: `Custom TCP`
    *   Port range: `6001`
    *   Source: `Anywhere-IPv4` (`0.0.0.0/0`)
7.  Click **Save rules**.

---

## 4. Connect via SSH

1.  Open your terminal.
2.  Locate your `.pem` key.
3.  Set permissions (Mac/Linux only):
    ```bash
    chmod 400 quantix-key.pem
    ```
4.  Connect:
    ```bash
    ssh -i "quantix-key.pem" ubuntu@YOUR_PUBLIC_DNS_OR_IP
    ```

---

## 5. Install & Run Quantix Node

Once connected, run these commands to install Docker and start the node.

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
# Attempts to connect to the network automatically via Bootnode
sudo docker compose -f docker-compose-peer.yml up -d --build
```

---

## 6. Verification

1.  **Check Logs**:
    ```bash
    sudo docker compose -f docker-compose-peer.yml logs -f
    ```
    Wait for lines like `connection to peer`.

2.  **Check Browser**:
    Go to `http://YOUR_PUBLIC_IP:3001/blocks`
    *(Note: Ensure you used the Public IPv4, not the Private one)*.
    You should see the blockchain data.
