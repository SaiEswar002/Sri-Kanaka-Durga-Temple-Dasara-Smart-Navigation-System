param()

$PROJECT_REF   = "rqmkggkphnrqswbpolzd"
$SERVICE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbWtnZ2twaG5ycXN3YnBvbHpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTQ1NDI4MSwiZXhwIjoyMTA1MDMwMjgxfQ.DOw8dhr1RGIms7F2Bzcas5rYYp58NOEW577BVhY9gRI"
$MIGRATIONS_DIR = Join-Path $PSScriptRoot "supabase\migrations"

$files = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name

Write-Host "Sri Kanaka Durga Temple - Database Migration Tool"
Write-Host "Project: $PROJECT_REF"
Write-Host "Found $($files.Count) migration files"
Write-Host ""

foreach ($file in $files) {
    $sql = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    Write-Host "Running: $($file.Name) ..." -NoNewline

    $jsonBody = ConvertTo-Json @{ query = $sql } -Depth 3 -Compress
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)

    try {
        $request = [System.Net.HttpWebRequest]::Create("https://api.supabase.com/v1/projects/$PROJECT_REF/database/query")
        $request.Method = "POST"
        $request.ContentType = "application/json"
        $request.Headers.Add("Authorization", "Bearer $SERVICE_KEY")
        $request.ContentLength = $bodyBytes.Length
        $stream = $request.GetRequestStream()
        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
        $stream.Close()

        $response = $request.GetResponse()
        Write-Host "  OK" -ForegroundColor Green
        $response.Close()
    }
    catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        if ($resp -ne $null) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $body = $reader.ReadToEnd()
            Write-Host "  FAILED ($([int]$resp.StatusCode)): $body" -ForegroundColor Red
        }
        else {
            Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Done! Verify at: https://supabase.com/dashboard/project/$PROJECT_REF/editor"
