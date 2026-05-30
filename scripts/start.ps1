$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Test-CommandExists {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-DockerQuiet {
    param([string[]]$Arguments)
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & docker @Arguments *> $null
    $exitCode = $global:LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    return $exitCode
}

function Test-DockerEngine {
    return (Invoke-DockerQuiet @("info")) -eq 0
}

function Start-DockerDesktopIfAvailable {
    $candidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "$env:LocalAppData\Docker\Docker Desktop.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            Write-Host "Docker Desktop found. Starting it..."
            Start-Process -FilePath $candidate | Out-Null
            return $true
        }
    }

    return $false
}

if (-not (Test-CommandExists "docker")) {
    Write-Host "Docker CLI is not installed or is not in PATH." -ForegroundColor Red
    Write-Host "Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
}

if ((Invoke-DockerQuiet @("compose", "version")) -ne 0) {
    Write-Host "Docker Compose plugin is unavailable. Update Docker Desktop." -ForegroundColor Red
    exit 1
}

if (-not (Test-DockerEngine)) {
    Write-Host "Docker Engine is not running." -ForegroundColor Yellow
    $started = Start-DockerDesktopIfAvailable

    if (-not $started) {
        Write-Host "Docker Desktop was not found. Install/start Docker Desktop manually, then run this script again." -ForegroundColor Red
        exit 1
    }

    Write-Host "Waiting for Docker Engine..."
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        if (Test-DockerEngine) {
            Write-Host "Docker Engine is ready." -ForegroundColor Green
            break
        }
    }
}

if (-not (Test-DockerEngine)) {
    Write-Host "Docker Engine did not become ready." -ForegroundColor Red
    Write-Host "Open Docker Desktop and make sure Linux containers / WSL 2 engine is enabled."
    exit 1
}

Write-Host "Starting VoltMarket from $repoRoot"
docker compose up --build
