try {
    $r = Invoke-WebRequest -Uri 'https://api.github.com' -TimeoutSec 15 -UseBasicParsing
    Write-Host "GitHub API: OK (Status $($r.StatusCode))"
} catch {
    Write-Host "GitHub API: FAILED - $($_.Exception.Message)"
}

try {
    $r2 = Invoke-WebRequest -Uri 'https://api.vercel.com/v2' -TimeoutSec 15 -UseBasicParsing
    Write-Host "Vercel API: OK (Status $($r2.StatusCode))"
} catch {
    Write-Host "Vercel API: FAILED - $($_.Exception.Message)"
}

try {
    $r3 = Invoke-WebRequest -Uri 'https://www.google.com' -TimeoutSec 10 -UseBasicParsing
    Write-Host "Google: OK (Status $($r3.StatusCode))"
} catch {
    Write-Host "Google: FAILED - $($_.Exception.Message)"
}
