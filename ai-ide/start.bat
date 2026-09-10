@echo off
echo ========================================
echo   AI IDE - AI-Native Coding Platform
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Install backend dependencies if needed
if not exist "backend\node_modules" (
    echo.
    echo Installing backend dependencies...
    cd backend
    call npm install
    npx prisma generate
    npx prisma db push
    cd ..
)

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo.
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Starting AI IDE...
echo.

REM Start backend in background
echo Starting backend server on port 3001...
start "AI IDE Backend" cmd /c "cd backend && node src/server.js"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend on port 5173...
cd frontend && npm run dev
