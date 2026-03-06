@echo off
echo.
echo  ====================================
echo   IG Monitor Pro - Iniciando...
echo  ====================================
echo.

:: Build do frontend React
echo [1/2] Buildando o frontend React...
cd frontend-react
call npm run build
if errorlevel 1 (
    echo [ERRO] Falha no build do frontend! Verifique os logs acima.
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend compilado com sucesso.
echo.

:: Iniciar o servidor FastAPI
echo [2/2] Iniciando o servidor FastAPI...
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000
