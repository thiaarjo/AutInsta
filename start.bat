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

:: Iniciar o Redis Server (Opcional se colocado na pasta 'redis' do projeto)
if exist "redis\redis-server.exe" (
    echo [1.5/3] Iniciando Servidor Redis local...
    start cmd /k "title Redis Server AutInsta && cd redis && redis-server.exe"
    echo [OK] Servidor Redis iniciado.
    echo.
) else (
    echo [AVISO] 'redis-server.exe' nao encontrado na pasta 'redis' do projeto. Assume-se que ja esta rodando.
    echo.
)

:: Iniciar os Workers do Celery (Background Tasks) - 2 workers para extrações paralelas
echo [2/3] Iniciando Celery Workers em background (x2 para paralelismo)...
start cmd /k "title Celery Worker 1 AutInsta && cd /d "%~dp0" && echo [Worker 1 Iniciado] && venv\Scripts\activate.bat && celery -A core.celery_app worker -l info --pool=solo -n worker1@%%computername%%"
start cmd /k "title Celery Worker 2 AutInsta && cd /d "%~dp0" && echo [Worker 2 Iniciado] && venv\Scripts\activate.bat && celery -A core.celery_app worker -l info --pool=solo -n worker2@%%computername%%"
echo [OK] 2 janelas do Celery Worker abertas (extrações simultâneas habilitadas).
echo.

:: Iniciar o servidor FastAPI
echo [3/3] Iniciando o servidor FastAPI...
echo.
venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000
