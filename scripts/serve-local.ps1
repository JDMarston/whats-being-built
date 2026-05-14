param(
  [int]$Port = 5173,
  [string]$HostName = "0.0.0.0"
)

npm run dev -- --host $HostName --port $Port
