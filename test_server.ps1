cd "E:\YPWI ABSENSI"
try {
    $nodePath = "C:\Program Files\nodejs\node.exe"
    if (!(Test-Path $nodePath)) {
        $nodePath = "node.exe"
    }
    $process = Start-Process -FilePath $nodePath -ArgumentList "server.js" -NoNewWindow -PassThru -RedirectStandardOutput "output.txt" -RedirectStandardError "error.txt"
    Start-Sleep -Seconds 5
    Get-Content "output.txt" | Select-Object -First 20
    Get-Content "error.txt" | Select-Object -First 20
    Stop-Process -Id $process.Id -Force
} catch {
    Write-Host "Error: $_"
}