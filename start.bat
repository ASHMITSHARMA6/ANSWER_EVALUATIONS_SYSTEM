@echo off
REM AUTOSTART SCRIPT FOR WINDOWS
REM Usage: start.bat

echo.
echo ============================================
echo Vector Evaluation System - Auto Startup
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js not found
    echo Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] Setting up Backend...
cd backend

if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
)

if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo WARNING: Edit .env with your MongoDB URI
)

echo Running seed...
call npm run seed

echo.
echo [2/3] Starting Backend (http://localhost:5000)...
start cmd /k "npm start"

cd ..
cd frontend

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

echo.
echo [3/3] Starting Frontend (http://localhost:3000)...
start cmd /k "npm start"

echo.
echo ============================================
echo SYSTEM STARTING
echo ============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Login:    teacher@test.com / teacher123
echo.
echo NOTE: Two browser windows will open shortly
echo ============================================
echo.

timeout /t 5

start http://localhost:3000
