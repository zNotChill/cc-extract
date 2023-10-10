# This clears your authentication cache for your Microsoft account
# (this **only** clears for Mineflayer)
# Useful for testing or re-authenticating

$CurrentDirectory = Get-Location

Write-Output "Press the Y key to clear your nmp-cache, or any other key to cancel"
$Key = Read-Host

if ($Key -ne "Y") {
  Write-Output "Cancelled"
  return
}

Set-Location $env:APPDATA\.minecraft\nmp-cache
Remove-Item -Recurse -Force *

Write-Output "Cleared nmp-cache successfully"

Set-Location $CurrentDirectory