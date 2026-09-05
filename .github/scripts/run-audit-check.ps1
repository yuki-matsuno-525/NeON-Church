[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[a-zA-Z0-9][a-zA-Z0-9._-]*$")]
    [string]$Name,

    [string]$WorkingDirectory = ".",

    [ValidateRange(1, 200)]
    [int]$MaxSignalLines = 30,

    [Parameter(Mandatory = $true)]
    [string]$Executable,

    [string]$ArgumentsJson = "[]"
)

$ErrorActionPreference = "Stop"
$auditRepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$auditWorkingDirectory = (Resolve-Path (Join-Path $auditRepoRoot $WorkingDirectory)).Path
$auditRepoPrefix = $auditRepoRoot.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar

if (
    $auditWorkingDirectory -ne $auditRepoRoot -and
    -not $auditWorkingDirectory.StartsWith($auditRepoPrefix, [System.StringComparison]::OrdinalIgnoreCase)
) {
    throw "WorkingDirectory must stay inside the repository: $WorkingDirectory"
}

$auditLogDirectory = Join-Path $auditRepoRoot "artifacts/audit/logs"
New-Item -ItemType Directory -Force -Path $auditLogDirectory | Out-Null
$auditTimestamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$auditLogPath = Join-Path $auditLogDirectory "$auditTimestamp-$Name.log"
$auditStopwatch = [System.Diagnostics.Stopwatch]::StartNew()

if (-not $ArgumentsJson.TrimStart().StartsWith("[")) {
    throw "ArgumentsJson must be a JSON array containing only strings."
}

$auditArguments = @($ArgumentsJson | ConvertFrom-Json)
$auditHadNoColor = Test-Path Env:NO_COLOR
$auditNoColorValue = $env:NO_COLOR

if ($auditArguments | Where-Object { $_ -isnot [string] }) {
    throw "ArgumentsJson must be a JSON array containing only strings."
}

Push-Location $auditWorkingDirectory
try {
    # Some JS test runners force color in workers and make Node warn when the
    # inherited NO_COLOR also exists. Redirected audit logs need neither warning.
    Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
    & $Executable @auditArguments *> $auditLogPath
    $auditExitCode = if ($null -eq $LASTEXITCODE) { if ($?) { 0 } else { 1 } } else { $LASTEXITCODE }
}
catch {
    $_ | Out-String | Add-Content -Path $auditLogPath
    $auditExitCode = 1
}
finally {
    if ($auditHadNoColor) {
        $env:NO_COLOR = $auditNoColorValue
    }
    Pop-Location
    $auditStopwatch.Stop()
}

$auditSignalPattern = "(?i)(error|failed|failure|warning|warn|skipped|flake|retry|traceback|exception|timeout)"
$auditSignalMatches = @(
    Select-String -Path $auditLogPath -Pattern $auditSignalPattern |
        Where-Object { $_.Line -notmatch "(?i)^\s*(ok|pass(?:ed)?|✓)\b" }
)
$auditSummary = [ordered]@{
    name = $Name
    status = if ($auditExitCode -eq 0) { "passed" } else { "failed" }
    exitCode = $auditExitCode
    durationSeconds = [Math]::Round($auditStopwatch.Elapsed.TotalSeconds, 2)
    signalLineCount = $auditSignalMatches.Count
    log = [System.IO.Path]::GetRelativePath($auditRepoRoot, $auditLogPath).Replace("\", "/")
}

$auditSummary | ConvertTo-Json -Compress
if ($auditSignalMatches.Count -gt 0) {
    "--- diagnostic signals (last $([Math]::Min($MaxSignalLines, $auditSignalMatches.Count)) of $($auditSignalMatches.Count)) ---"
    $auditSignalMatches |
        Select-Object -Last $MaxSignalLines |
        ForEach-Object { "{0}:{1}" -f $_.LineNumber, $_.Line.Trim() }
}

exit $auditExitCode
