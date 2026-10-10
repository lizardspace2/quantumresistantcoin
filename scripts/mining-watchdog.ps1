# Quantix failover watchdog — run on the SECONDARY node (PC2).
#
# Polls the master node's HTTP API. While the master is unreachable,
# this node mines so the chain keeps growing; as soon as the master
# answers again, mining is switched off so the two never compete.
#
# Setup (run once, as admin or via Task Scheduler):
#   1. Edit $MasterUrl below with PC1's reachable address (Tailscale
#      IP or LAN IP — the HTTP port 3001 must be open/forwarded).
#   2. Set $ComposeDir to this repo's checkout on PC2.
#   3. Schedule: schtasks /create /tn QuantixWatchdog /sc minute /mo 2 `
#        /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\path\mining-watchdog.ps1"
#
# IMPORTANT: mining overlap = permanent fork, and parallel relayers can
# double-mint bridge txs (the Supabase claim is not atomic). The 3-strike
# debounce avoids flapping; keep the check interval at 1-2 minutes minimum.

$MasterUrl   = "http://PC1_TAILSCALE_IP:3001/debug"   # <-- EDIT ME
$ComposeDir  = "C:\path\to\quantumresistantcoin"       # <-- EDIT ME
$RelayerDir  = "C:\path\to\quantix-key-forge"          # <-- EDIT ME ("" = no relayer failover)
$FailoverYml = "docker-compose-failover.yml"
$EnvFile     = Join-Path $ComposeDir ".env"
$StateFile   = Join-Path $ComposeDir ".failover-state"
$LogFile     = Join-Path $ComposeDir "watchdog.log"
$DownStrikes = 3                                        # checks before mining

function Write-Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Out-File -Append $LogFile
}

function Test-Master {
    try {
        $null = Invoke-RestMethod -Uri $MasterUrl -TimeoutSec 10
        return $true
    } catch {
        return $false
    }
}

function Set-Mining([bool]$enabled) {
    # Write ENABLE_MINING into .env and recreate the container so the
    # new variable is picked up at boot.
    $line = "ENABLE_MINING=" + ($enabled ? "true" : "false")
    if (Test-Path $EnvFile) {
        (Get-Content $EnvFile) -replace '^ENABLE_MINING=.*', $line |
            Where-Object { $_ -notmatch '^$' } | Set-Content $EnvFile
        if (-not (Select-String -Path $EnvFile -Pattern '^ENABLE_MINING=' -Quiet)) {
            Add-Content $EnvFile $line
        }
    } else {
        Set-Content $EnvFile $line
    }
    Push-Location $ComposeDir
    docker compose -f docker-compose-peer.yml up -d 2>&1 | Out-Null
    Pop-Location
    Write-Log "Mining switched to $enabled (container recreated)"
}

function Set-Relayers([bool]$enabled) {
    # Starts/stops the relayer + tunnel failover stack (key-forge
    # docker-compose-failover.yml, profile "failover"). Skipped when
    # $RelayerDir is empty or missing.
    if (-not $RelayerDir -or -not (Test-Path (Join-Path $RelayerDir $FailoverYml))) {
        return
    }
    Push-Location $RelayerDir
    if ($enabled) {
        docker compose -f $FailoverYml --profile failover up -d 2>&1 | Out-Null
    } else {
        docker compose -f $FailoverYml --profile failover stop 2>&1 | Out-Null
    }
    Pop-Location
    Write-Log "Relayer failover stack switched to $enabled"
}

$state = @{ strikes = 0; mining = $false }
if (Test-Path $StateFile) {
    $state = Get-Content $StateFile -Raw | ConvertFrom-Json
}

if (Test-Master) {
    if ($state.mining) {
        Set-Relayers $false
        Set-Mining $false
        Write-Log "Master reachable again — failover mining + relayers OFF"
    }
    $state.strikes = 0
    $state.mining = $false
} else {
    $state.strikes++
    Write-Log "Master unreachable (strike $($state.strikes)/$DownStrikes)"
    if (-not $state.mining -and $state.strikes -ge $DownStrikes) {
        Set-Mining $true
        Set-Relayers $true
        Write-Log "Failover ON (mining + relayers) — master down for $DownStrikes checks"
        $state.mining = $true
    }
}

$state | ConvertTo-Json | Set-Content $StateFile
