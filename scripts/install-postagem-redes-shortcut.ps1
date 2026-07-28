param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^https?://')]
    [string]$PortalUrl,
    [string]$DesktopPath = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'
$appDirectory = Join-Path $env:LOCALAPPDATA 'PostagemRedes'
$iconPath = Join-Path $appDirectory 'postagem_redes.ico'
$shortcutPath = Join-Path $DesktopPath 'Postagem Redes.lnk'

& (Join-Path $PSScriptRoot 'generate-shortcut-icon.ps1') -OutputPath $iconPath

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:WINDIR\explorer.exe"
$shortcut.Arguments = $PortalUrl
$shortcut.WorkingDirectory = $appDirectory
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'Abrir a central de conteúdo e aprovação de Postagem Redes'
$shortcut.Save()

Write-Host "Atalho criado em $shortcutPath"
