# ============================================
# Fix Java PATH to prioritize Java 17
# ============================================
# This script removes Oracle Java 8 from PATH and sets Java 17 as primary

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ This script must run as Administrator" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Fixing Java PATH configuration..." -ForegroundColor Cyan

$java17Home = "C:\Users\MoustafaMohamed\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.18.8-hotspot"

# Get current PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
Write-Host "Current PATH (User): $currentPath" -ForegroundColor Gray

# Remove Oracle Java 8 path if it exists
$newPath = $currentPath -replace "C:\\Program Files \(x86\)\\Common Files\\Oracle\\Java\\javapath;?", ""

# Add Java 17 bin at the beginning
$newPath = "$java17Home\bin;$newPath"

# Remove duplicate semicolons
$newPath = $newPath -replace ";;", ";"

# Set the new PATH
[System.Environment]::SetEnvironmentVariable("PATH", $newPath, "User")

Write-Host "✅ PATH updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Changes made:" -ForegroundColor Cyan
Write-Host "  ✓ Removed: C:\Program Files (x86)\Common Files\Oracle\Java\javapath"
Write-Host "  ✓ Added (first): $java17Home\bin"
Write-Host ""

# Verify JAVA_HOME
$javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "User")
Write-Host "JAVA_HOME is set to: $javaHome" -ForegroundColor Yellow
Write-Host ""

# Test with Java 17
Write-Host "🧪 Verifying Java 17 installation..." -ForegroundColor Cyan
& "$java17Home\bin\java.exe" -version

Write-Host ""
Write-Host "⚠️  NOTE: You must CLOSE and REOPEN PowerShell/Command Prompt for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Java PATH fix complete! Run 'java -version' in a new terminal to verify." -ForegroundColor Green
