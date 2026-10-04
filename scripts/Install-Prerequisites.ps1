param([switch]$RunDev)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$installerCache = Join-Path ([IO.Path]::GetTempPath()) 'DartsCZ-Setup'
New-Item -ItemType Directory -Path $installerCache -Force | Out-Null
function Get-OfficialInstaller([string]$Url, [string]$FileName) {
    $destination = Join-Path $installerCache $FileName
    Write-Host ('Stahuji ' + $FileName + ' z oficiálního zdroje...')
    Invoke-WebRequest -Uri $Url -OutFile $destination -UseBasicParsing
    return $destination
}
$programFilesX86 = [Environment]::GetFolderPath('ProgramFilesX86')
$vswhere = Join-Path $programFilesX86 'Microsoft Visual Studio\Installer\vswhere.exe'
$compiler = @()
if (Test-Path -LiteralPath $vswhere) {
    $compiler = @(& $vswhere -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find 'VC\Tools\MSVC\**\bin\Hostx64\x64\cl.exe')
}
$sdkRoot = $null
try { $sdkRoot = Get-ItemPropertyValue -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots' -Name KitsRoot10 -ErrorAction Stop } catch { }
$sdkPresent = $sdkRoot -and (Test-Path -LiteralPath (Join-Path $sdkRoot 'Include'))
if (-not $compiler.Count -or -not $sdkPresent) {
    $buildTools = Get-OfficialInstaller 'https://aka.ms/vs/17/release/vs_BuildTools.exe' 'vs_BuildTools.exe'
    $signature = Get-AuthenticodeSignature -LiteralPath $buildTools
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation') {
        throw 'Podpis instalátoru Microsoft nelze ověřit. Instalace byla zastavena.'
    }
    Write-Host 'Instaluji C++ Build Tools a Windows SDK. Windows může požádat o potvrzení správce.'
    $buildToolsPath = Join-Path $programFilesX86 'Microsoft Visual Studio\2022\BuildTools'
    $installerArgs = @('--quiet','--wait','--norestart','--add','Microsoft.VisualStudio.Workload.VCTools','--includeRecommended','--installPath',('"' + $buildToolsPath + '"'))
    $installed = Start-Process -FilePath $buildTools -ArgumentList $installerArgs -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($installed.ExitCode -notin @(0,3010)) { throw ('Instalace Build Tools selhala, kód ' + $installed.ExitCode) }
    if ($installed.ExitCode -eq 3010) { Write-Host 'Build Tools požadují restart Windows. Skript sám systém nerestartuje.' }
}
$cargoBin = if ($env:CARGO_HOME) { Join-Path $env:CARGO_HOME 'bin' } else { Join-Path $env:USERPROFILE '.cargo\bin' }
$env:PATH = $cargoBin + ';' + $env:PATH
if (-not (Get-Command rustup -ErrorAction SilentlyContinue)) {
    $rustInstaller = Get-OfficialInstaller 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' 'rustup-init.exe'
    $hashFile = Get-OfficialInstaller 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe.sha256' 'rustup-init.exe.sha256'
    $expectedHash = ((Get-Content -LiteralPath $hashFile -Raw).Trim() -split '\s+')[0]
    $actualHash = (Get-FileHash -LiteralPath $rustInstaller -Algorithm SHA256).Hash
    if ($actualHash -ne $expectedHash) { throw 'Kontrolní součet Rust instalátoru nesouhlasí. Instalace byla zastavena.' }
    & $rustInstaller -y --profile minimal --default-toolchain stable-x86_64-pc-windows-msvc
    if ($LASTEXITCODE -ne 0) { throw ('Instalace Rustu selhala, kód ' + $LASTEXITCODE) }
}
& rustup toolchain install stable-x86_64-pc-windows-msvc --profile minimal
if ($LASTEXITCODE -ne 0) { throw 'Instalace Rust toolchainu selhala.' }
Push-Location $projectRoot
try {
    & rustup override set stable-x86_64-pc-windows-msvc
    if ($LASTEXITCODE -ne 0) { throw 'Nastavení projektového Rust toolchainu selhalo.' }
    & rustc --version
    & cargo --version
    $bundledRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $bundledNode = Join-Path $bundledRoot 'node\bin\node.exe'
        if (-not (Test-Path -LiteralPath $bundledNode)) { throw 'Je potřeba Node.js 22.18+ nebo 24 LTS.' }
        $env:PATH = (Split-Path -Parent $bundledNode) + ';' + $env:PATH
    }
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        $bundledPnpm = Join-Path $bundledRoot 'bin\fallback\pnpm.cmd'
        if (-not (Test-Path -LiteralPath $bundledPnpm)) { throw 'pnpm nebyl nalezen. Použijte pnpm 11 nebo npm podle README.' }
        $env:PATH = (Split-Path -Parent $bundledPnpm) + ';' + $env:PATH
    }
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Instalace projektových závislostí selhala.' }
    & pnpm test
    if ($LASTEXITCODE -ne 0) { throw 'Testy selhaly.' }
    & pnpm build
    if ($LASTEXITCODE -ne 0) { throw 'Sestavení frontendu selhalo.' }
    & pnpm tauri info
    Write-Host 'Předpoklady připravené. Nativní sestavení potvrdí až následující spuštění.'
    if ($RunDev) { & pnpm tauri:dev }
} finally { Pop-Location }
