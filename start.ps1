Write-Host "building docker"

$Build_Command = "docker build --tag wstest .";

Invoke-Expression $Build_Command

Invoke-Expression "docker run -p 5566:5566 wstest"