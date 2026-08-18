# Windows Task Scheduler Setup for Daily Tender Collection
# Run this as Administrator

# Configuration
$TaskName = "AiForm-Daily-Tender-Collection"
$TaskDescription = "Run tender collectors daily at 6:00 AM"
$PythonPath = "C:\Python314\python.exe"  # Update if different
$ScriptPath = "C:\dev\monate-connect\scheduler_daily_collectors.py"
$WorkingDir = "C:\dev\monate-connect"
$RunTime = "06:00"  # Change this to your preferred time (HH:MM format)

Write-Host "Setting up Windows Task Scheduler for daily tender collection..."
Write-Host ""

# Check if running as Administrator
$IsAdmin = ([Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains 'S-1-5-32-544')
if (-not $IsAdmin) {
    Write-Error "This script must be run as Administrator!"
    exit 1
}

# Remove existing task if it exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Removing existing task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create task action
$Action = New-ScheduledTaskAction `
    -Execute $PythonPath `
    -Argument $ScriptPath `
    -WorkingDirectory $WorkingDir

# Create task trigger (daily at specified time)
$Trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At $RunTime

# Create task settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Register the task
$Task = Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description $TaskDescription `
    -User (whoami) `
    -RunLevel Highest

Write-Host ""
Write-Host "✅ Task created successfully!"
Write-Host ""
Write-Host "Task Details:"
Write-Host "  Name: $TaskName"
Write-Host "  Description: $TaskDescription"
Write-Host "  Schedule: Daily at $RunTime"
Write-Host "  Script: $ScriptPath"
Write-Host ""
Write-Host "To modify the schedule:"
Write-Host "  1. Open Task Scheduler (tasksched.msc)"
Write-Host "  2. Find '$TaskName'"
Write-Host "  3. Right-click and select 'Properties'"
Write-Host "  4. Edit the trigger to change the time"
Write-Host ""
Write-Host "To remove the task:"
Write-Host "  Unregister-ScheduledTask -TaskName '$TaskName'"
