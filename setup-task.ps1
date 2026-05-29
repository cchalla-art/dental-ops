# ============================================================
#  Dental Ops - Windows Task Scheduler Setup
#  Run this script as Administrator once to register the task.
#  Usage:  .\setup-task.ps1
#  To remove the task:  .\setup-task.ps1 -Uninstall
# ============================================================

param(
    [switch]$Uninstall
)

# ---------- CONFIGURATION (edit these) ----------------------

$TaskName   = "Dental Ops Daily Report"
$ProjectDir = "C:\Users\cchalla\Repos\dental-ops"          # Folder where you cloned the repo
$RunTime    = "08:00"                  # Time to run each day (24hr format)
$RunDays    = @("Monday","Tuesday","Wednesday","Thursday","Friday")

# Optional: run a second time mid-day (leave empty "" to skip)
$RunTimeMidDay = "12:00"

# Node.js path - auto-detected below, or set manually:
# $NodeExe = "C:\Program Files\nodejs\node.exe"

# ------------------------------------------------------------

# Auto-detect node.exe
$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $NodeExe) {
    Write-Error "Node.js not found. Install it from https://nodejs.org and re-run."
    exit 1
}

Write-Host "Using Node.js at: $NodeExe" -ForegroundColor Cyan

# ---------- UNINSTALL ---------------------------------------

if ($Uninstall) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Task '$TaskName' removed." -ForegroundColor Yellow
    } else {
        Write-Host "Task '$TaskName' not found." -ForegroundColor Gray
    }
    exit 0
}

# ---------- INSTALL -----------------------------------------

# Verify project folder exists
if (-not (Test-Path $ProjectDir)) {
    Write-Error "Project folder not found: $ProjectDir`nClone the repo there first."
    exit 1
}

# Build triggers
$triggers = @()

foreach ($day in $RunDays) {
    $triggers += New-ScheduledTaskTrigger `
        -Weekly `
        -DaysOfWeek $day `
        -At $RunTime
}

# Optional mid-day run
if ($RunTimeMidDay -ne "") {
    foreach ($day in $RunDays) {
        $triggers += New-ScheduledTaskTrigger `
            -Weekly `
            -DaysOfWeek $day `
            -At $RunTimeMidDay
    }
}

# Action: node index.js all  (stdout + stderr also captured to logs\task.log)
$logFile = "$ProjectDir\logs\task.log"
$action = New-ScheduledTaskAction `
    -Execute "cmd.exe" `
    -Argument "/c `"$NodeExe`" index.js all >> `"$logFile`" 2>&1" `
    -WorkingDirectory $ProjectDir

# Settings
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `   # Run missed task if PC was off at scheduled time
    -RunOnlyIfNetworkAvailable

# Register (removes old version first if exists)
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Replaced existing task." -ForegroundColor Yellow
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Settings $settings `
    -RunLevel Highest `
    -Description "Runs OpenDental report queries and posts results to Zoom Team Chat."

Write-Host ""
Write-Host "Task '$TaskName' registered successfully!" -ForegroundColor Green
Write-Host "Runs: $($RunDays -join ', ') at $RunTime" -ForegroundColor Green
if ($RunTimeMidDay -ne "") {
    Write-Host "        and again at $RunTimeMidDay" -ForegroundColor Green
}
Write-Host ""
Write-Host "To run it RIGHT NOW:   Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Cyan
Write-Host "To remove it:          .\setup-task.ps1 -Uninstall" -ForegroundColor Cyan
Write-Host "To view logs:          Get-WinEvent -LogName 'Microsoft-Windows-TaskScheduler/Operational' | Where-Object { `$_.Message -like '*Dental*' } | Select-Object -First 10" -ForegroundColor Cyan
