# Quantix Node - Local Run Instructions

To run your blockchain node locally on Windows:

## 1. Prerequisites
- **Node.js**: Installed (v24.14.0 detected)
- **PowerShell**: Available

## 2. Environment Configuration
The `.env` file has been created with default settings:
- `HTTP_PORT=3001` (API Access)
- `P2P_PORT=6001` (P2P Network)
- `ENABLE_MINING=true` (Mining enabled)

## 3. How to Start
Open a PowerShell terminal in this directory and run:
```powershell
./start_node.ps1
```
This script will:
1. Compile the latest changes.
2. Start the node.
3. Automatically restart the node if it crashes.

## 4. How to Enable Auto-Start on Windows Boot
To make the node start automatically every time you log in to Windows, run this command once:
```powershell
./setup_autostart.ps1
```
This creates a task in Windows Task Scheduler named `QuantixMasterNode`.

## 5. Handling Dynamic IP and Shutdowns
- **Dynamic IP**: You don't need a static IP. Your node will connect to the genesis bootnode (`ws://35.225.236.73:6001`) and sync automatically.
- **Shutdowns**: The blockchain is saved in the `data/` directory. When you turn your computer back on and run the script, it will pick up exactly where it left off.

## 5. Verification
Once running, you can check your node's status at:
`http://localhost:3001/info`
