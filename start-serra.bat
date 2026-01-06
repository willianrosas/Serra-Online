@echo off
setlocal
REM Serra MVP - Iniciador (Windows CMD)
REM Requisitos: Node.js LTS instalado

cd /d "%~dp0"

echo ==========================================
echo   SERRA MVP - START (server + client)
echo ==========================================
echo.

REM Inicia o SERVER em uma janela separada
start "Serra Server" cmd /k "cd /d "%~dp0server" ^& npm install ^& npm run dev"

REM Aguarda um pouco para o server subir
timeout /t 2 /nobreak >nul

REM Inicia o CLIENT em uma janela separada
start "Serra Client" cmd /k "cd /d "%~dp0client" ^& npm install ^& npm run dev"

echo.
echo Pronto! Duas janelas foram abertas:
echo - Serra Server (porta 3001)
echo - Serra Client (porta 5173)
echo.
echo Quando o client mostrar a URL, abra no navegador.
echo.
pause
