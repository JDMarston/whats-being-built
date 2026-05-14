param(
    [Parameter(Mandatory = $true)]
    [string]$Prompt,

    [string]$Model = "qwen2.5-coder:1.5b"
)

$body = @{
    model  = $Model
    prompt = $Prompt
    stream = $false
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:11434/api/generate" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"

    if ($null -eq $response) {
        Write-Host "No response returned from Ollama."
        exit 1
    }

    if ([string]::IsNullOrWhiteSpace($response.response)) {
        Write-Host "Ollama responded, but the model response was empty."
        Write-Host "Raw response:"
        $response | ConvertTo-Json -Depth 10
        exit 1
    }

    Write-Output $response.response
}
catch {
    Write-Host "Local Ollama request failed."
    Write-Host $_
    exit 1
}