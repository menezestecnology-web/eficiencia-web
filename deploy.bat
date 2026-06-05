@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   Eficiencia Individual - Deploy Supabase
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)

if not exist node_modules\ (
  echo Instalando dependencias ^(uma vez^)...
  call npm install --silent
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
  echo Dependencias instaladas.
  echo.
)

node deploy.js
echo.
pause
