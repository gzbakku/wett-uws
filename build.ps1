Write-Host "building docker"

$Build_Command = "docker build --tag wstest .";

Invoke-Expression $Build_Command