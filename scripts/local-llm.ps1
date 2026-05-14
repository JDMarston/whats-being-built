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

    $response.response
}
catch {
    Write-Error "Local Ollama request failed. Make sure Ollama is installed, running, and the model is pulled."
    exit 1
}