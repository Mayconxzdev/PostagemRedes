param(
    [string]$WorkflowDirectory = (Join-Path $PSScriptRoot '..\workflows')
)

$ErrorActionPreference = 'Stop'
$files = Get-ChildItem -LiteralPath $WorkflowDirectory -Filter '*.json' -File

if ($files.Count -eq 0) {
    throw "Nenhum workflow JSON encontrado em $WorkflowDirectory"
}

foreach ($file in $files) {
    $raw = Get-Content -LiteralPath $file.FullName -Raw
    $workflow = $raw | ConvertFrom-Json -Depth 100

    if ($workflow.active -ne $false) {
        throw "$($file.Name): export de portfólio deve permanecer inativo."
    }

    if ($raw -match '"credentials"') {
        throw "$($file.Name): referência de credencial encontrada."
    }

    if ($raw -match '(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b') {
        throw "$($file.Name): e-mail real encontrado."
    }
}

Write-Host "Workflows validados: $($files.Count)"
