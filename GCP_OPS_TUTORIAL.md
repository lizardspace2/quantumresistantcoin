# Google Cloud Platform (GCP) Operations Guide

This tutorial covers essential operations for maintaining your Quantix node on Google Cloud Platform, including securing your IP address, performing backups, and monitoring.

## 1. Setting up a Static IP Address

By default, GCP assigns an "Ephemeral" IP address to your VM, which changes if you restart the instance. For a stable node, you should reserve a Static IP.

### Step-by-Step
1.  Go to the **Google Cloud Console**.
2.  Navigate to **VPC network** > **IP addresses**.
3.  Locate the IP address currently assigned to your instance (it will be marked as "Ephemeral").
4.  Click the **three dots** (Menu) on the right side of that row.
5.  Select **Promote to static IP address**.
6.  Give it a name (e.g., `quantix-node-ip`) and click **Reserve**.

*Action required:* If you simply promoted the existing IP, you don't need to change anything on the VM. If you reserved a *new* IP, you must attach it to your VM via "Edit" on the VM instance page > Network interfaces.

## 2. Backups (Disk Snapshots)

It is crucial to backup your node, especially the wallet keys. GCP Snapshots are an easy way to back up the entire disk.

### Creating a Snapshot (Manual)
1.  Go to **Compute Engine** > **Storage** > **Snapshots**.
2.  Click **Create Snapshot**.
3.  **Name**: `quantix-backup-date`
4.  **Source disk**: Select the disk attached to your Quantix VM.
5.  **Location**: Regional (cheaper) or Multi-regional.
6.  Click **Create**.

### Scheduling Automatic Backups
1.  Go to **Snapshots** > **Snapshot Schedules**.
2.  Click **Create Snapshot Schedule**.
3.  Set the frequency (e.g., Daily or Weekly).
4.  Go to your **VM Instance** > **Disks**.
5.  Click on your boot disk.
6.  Click **Edit**.
7.  In "Snapshot schedule", select the schedule you just created.
8.  Click **Save**.

## 3. Monitoring Your Node

You can monitor the resource usage of your node directly from the console.

1.  Go to **Compute Engine** > **VM instances**.
2.  Click on the **Observability** tab (next to Details) for your instance.
3.  Here you can see:
    *   **CPU Utilization**: Ensure it doesn't stay at 100% specifically for `e2-micro` instances, as they use "CPU credits". If you run out of credits, performance will drop.
    *   **Network Bytes**: unexpected spikes might indicate an attack or heavy sync load.
    *   **Disk I/O**: High usage might slow down block processing.

## 4. Using Cloud Shell

If you don't have an SSH client or are on a different computer, use Cloud Shell to manage your node.

1.  Click the **Terminal Icon** (Activate Cloud Shell) in the top right of the blue navigation bar.
2.  Use the `gcloud` command to SSH:
    ```bash
    gcloud compute ssh --zone "us-central1-a" "quantix-node-1" --project "your-project-id"
    ```
    *(Replace zone and instance name with yours. The console usually gives you this command string if you click "View gcloud command" in the SSH dropdown).*

## 5. Resizing the Instance

If `e2-micro` is too slow:

1.  **Stop** the instance (you cannot resize while running).
2.  Click **Edit**.
3.  Change **Machine type** to `e2-medium` (2 vCPU, 4GB RAM) or `e2-standard-2`.
4.  **Save**.
5.  **Start** the instance.
