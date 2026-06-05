@echo off
setlocal
cd /d "%~dp0"
title Eficiencia Individual - Servidor Local

echo ============================================
echo   Sistema Eficiencia Individual
echo   Servidor local em http://localhost:3000
echo ============================================
echo.
echo Abrindo o navegador em 3 segundos...
echo NAO FECHE ESTA JANELA enquanto estiver usando o sistema.
echo.

start "" "http://localhost:3000/index.html"

npx --yes serve . -l 3000 --no-port-switching
