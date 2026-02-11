
# Troubleshooting

## Node not syncing?

### 1. Check Peers
First, check if you are connected to any peers.
```bash
curl -s http://localhost:3001/peers
```
If the list is empty `[]` or only contains `::ffff:...`, verification failed or connection is blocked.

### 2. Check Connection to Main Node
Try to manually reach the genesis node:
```bash
nc -zv 35.225.236.73 6001
```
*   **Success**: "Connection to ... succeeded!" -> Network is fine. Move to Step 3.
*   **Failure**: "Connection timed out" -> Firewall issue.
    *   Check your VM firewall (is port 6001 open?)
    *   Check if your ISP/Provider allows outgoing traffic on 6001.

### 3. Compare Block Hashes
Sometimes a node gets stuck on a bad fork or old data. Compare your latest block hash (from `/info`) with the main node.

```bash
# Your Node
curl -s http://localhost:3001/info | jq .

# Main Node
curl -s http://35.225.236.73:3001/info | jq .
```

*   **If hashes are DIFFERENT**: The node is on a fork. You must reset it.
    *   Stop the container: `sudo docker stop quantix-node`
    *   Remove the data directory (or volume).
    *   Restart the container to resync from scratch.

*   **If hashes are IDENTICAL**: The node is just stuck (handshake missed). Proceed to step 4.

### 4. Force Synchronization (Restart)
If the hashes match but height is stuck, restarting the node will force a new handshake and trigger synchronization immediately.

**Identify the container name:**
```bash
sudo docker ps
```

**Restart the container:**
```bash
sudo docker restart <container_name>
# Example: sudo docker restart quantix-node
```

### 5. Check Docker Logs
If all else fails, the logs usually tell the truth.
```bash
sudo docker logs --tail 50 -f <container_name>
```
Look for "Recursive error", "p2p error", or "Rejected".

### 6. GCP SSH Error: "Code: 4003 failed to connect to backend"
This means Google's Identity-Aware Proxy (IAP) cannot reach your VM on port 22. You need to allow their specific IP range.

**Fix:** Run this in your local terminal or Cloud Shell:
```bash
gcloud compute firewall-rules create allow-ssh-ingress-from-iap \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20
```
