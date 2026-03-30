$TaskName = "QuantixMasterNode"
$ScriptPath = "c:\Users\moi\Desktop\quantumresistantcoin\start_node.ps1"
$WorkingDirectory = "c:\Users\moi\Desktop\quantumresistantcoin"

# Action: Run powershell with the script
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Minimized -ExecutionPolicy Bypass -File `"$ScriptPath`"" -WorkingDirectory $WorkingDirectory

# Trigger: At logon
$Trigger = New-ScheduledTaskTrigger -AtLogon

# Settings: Ensure it doesn't stop if it takes too long, and allow it to run on battery
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 365)

# Register the task
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Automatically starts the Quantix Master Node on login" -Force

Write-Host "SUCCESS: Quantix Master Node has been scheduled to start automatically when you log in." -ForegroundColor Green
Write-Host "You can manage this task in 'Task Scheduler' under the name '$TaskName'." -ForegroundColor Cyan
