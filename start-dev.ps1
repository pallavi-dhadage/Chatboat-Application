$backend = Join-Path $PSScriptRoot 'backend-flask'
$frontend = Join-Path $PSScriptRoot 'frontend'

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$backend'; python run_simple.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$frontend'; if (!(Test-Path node_modules)) { npm install }; npm start"
"""Backend and frontend panels have been launched."""""""""""""""""""""""""""