# Fix Java PATH - Direct Version
# Run this in PowerShell as Administrator

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator" -ForegroundColor Red
    Write-Host "Please: Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Java PATH Fix ===" -ForegroundColor Cyan

$java17Home = "C:\Users\MoustafaMohamed\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$oracleJavaPath = "C:\Program Files (x86)\Common Files\Oracle\Java\javapath"

# Get current PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
Write-Host "Current PATH length: $($currentPath.Length) chars" -ForegroundColor Gray

# Remove Oracle Java path
$newPath = $currentPath -replace [regex]::Escape($oracleJavaPath) + ";?", ""

# Add Java 17 at front
$newPath = "$java17Home\bin;$newPath"

# Clean up double semicolons
$newPath = $newPath -replace ";;+", ";"

# Set new PATH
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

Write-Host "✓ PATH updated" -ForegroundColor Green
Write-Host "✓ Removed: $oracleJavaPath" -ForegroundColor Green
Write-Host "✓ Added: $java17Home\bin" -ForegroundColor Green

Write-Host "`n=== Verification ===" -ForegroundColor Cyan
& "$java17Home\bin\java.exe" -version

Write-Host "`n⚠️  IMPORTANT: Close PowerShell and open a NEW one to apply changes!" -ForegroundColor Yellow
Write-Host "Then run: java -version" -ForegroundColor Yellow
