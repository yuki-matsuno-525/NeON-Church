param(
    [ValidateRange(1, 60)]
    [int]$Attempts = 1,

    [ValidateRange(0, 300)]
    [int]$DelaySeconds = 0
)

$ErrorActionPreference = "Stop"

$targets = @(
    @{ Name = "home"; Url = "https://neon-church.com/" },
    @{ Name = "login"; Url = "https://neon-church.com/login" },
    @{ Name = "privacy"; Url = "https://neon-church.com/privacy" },
    @{ Name = "terms"; Url = "https://neon-church.com/terms" },
    @{ Name = "robots"; Url = "https://neon-church.com/robots.txt" },
    @{ Name = "sitemap"; Url = "https://neon-church.com/sitemap.xml" },
    @{ Name = "health"; Url = "https://neon-church-api.onrender.com/healthz/" },
    @{ Name = "books API"; Url = "https://neon-church-api.onrender.com/api/books/" },
    @{ Name = "admin login"; Url = "https://neon-church-api.onrender.com/admin/login/" },
    @{ Name = "admin CSS"; Url = "https://neon-church-api.onrender.com/static/admin/css/base.css" }
)

for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    $failures = @()

    foreach ($target in $targets) {
        try {
            $response = Invoke-WebRequest -Uri $target.Url -MaximumRedirection 5 -TimeoutSec 30
            if ($response.StatusCode -ne 200) {
                $failures += "$($target.Name): HTTP $($response.StatusCode)"
            }
        }
        catch {
            $failures += "$($target.Name): $($_.Exception.Message)"
        }
    }

    try {
        $health = Invoke-RestMethod -Uri "https://neon-church-api.onrender.com/healthz/" -TimeoutSec 30
        if ($health.status -ne "ok" -or $health.db -ne $true) {
            $failures += "health payload: status=$($health.status), db=$($health.db)"
        }
    }
    catch {
        $failures += "health payload: $($_.Exception.Message)"
    }

    if ($failures.Count -eq 0) {
        Write-Host "Production smoke test passed on attempt $attempt."
        exit 0
    }

    Write-Warning ("Attempt {0}/{1} failed: {2}" -f $attempt, $Attempts, ($failures -join "; "))
    if ($attempt -lt $Attempts -and $DelaySeconds -gt 0) {
        Start-Sleep -Seconds $DelaySeconds
    }
}

throw "Production smoke test failed after $Attempts attempt(s)."
