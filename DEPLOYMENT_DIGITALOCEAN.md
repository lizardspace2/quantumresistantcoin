# Deployment Guide: DigitalOcean

This guide details how to deploy your Quantix node on **DigitalOcean**. It is often preferred for its simplicity.

## 1. Prerequisites

*   A **DigitalOcean** account.
*   An SSH Key added to your DigitalOcean account (Settings > Security > SSH Keys).

---

## 2. Create the Droplet

1.  Log in to the dashboard and click **Create** > **Droplets**.
2.  **Region**: Choose the one closest to you (e.g., London, New York).
3.  **Choose an Image**: **Ubuntu 22.04 LTS** (x64).
4.  **Choose Size**:
    *   **Shared CPU** -> **Basic**
    *   **Regular** (Disk type)
    *   **$6/mo** (1 GB / 1 CPU) is sufficient for a basic node.
5.  **Authentication**: Select **SSH Key** and check your key.
6.  **Hostname**: Give it a name like `quantix-node-do`.
7.  Click **Create Droplet**.

---

## 3. Configure Firewall (UFW)

On DigitalOcean, it is best practice to configure the internal firewall (`ufw`) immediately.

1.  **SSH** into your droplet:
    ```bash
    ssh root@YOUR_DROPLET_IP
    ```

2.  **Run the following commands**:

    ```bash
    # 1. Allow SSH (Critical, otherwise you lock yourself out)
    ufw allow 22/tcp

    # 2. Allow Quantix API
    ufw allow 3001/tcp

    # 3. Allow Quantix P2P
    ufw allow 6001/tcp

    # 4. Enable the firewall
    ufw enable
    ```
    *Answer `y` when it warns that this may disrupt existing connections.*

---

## 4. Install & Run Quantix Node

Run these commands on your Droplet:

```bash
# 1. Install Docker & Tools
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release git nano
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 2. Clone Repository
git clone https://github.com/lizardspace2/Quantix-Core.git
cd Quantix-Core

# 3. Start Peer Node
docker compose -f docker-compose-peer.yml up -d --build
```
*(Note: As `root`, `sudo` is not strictly necessary, but included in other guides)*

---

## 5. Verification

1.  **Check Logs**:
    ```bash
    docker compose -f docker-compose-peer.yml logs -f
    ```

2.  **Check Browser**:
    Go to `http://YOUR_DROPLET_IP:3001/blocks`

---

## 6. Troubleshooting

**"Connection Refused"**:
*   Did you run `ufw enable`?
*   Check status: `ufw status`. It should say `3001/tcp ALLOW Anywhere`.
