# AuraIQ — Start all services
Write-Host "Starting AuraIQ..." -ForegroundColor Magenta

# Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

# Backend (requires venv setup first — see README)
# Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; uvicorn main:app --reload --port 8000"

Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
