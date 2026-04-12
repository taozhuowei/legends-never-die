@echo off
chcp 65001 >nul
echo ========================================
echo  LegendsNeverDie - Java Game Launcher
echo ========================================
echo.

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not installed or not in PATH
    echo Please install Java 8 or higher
    pause
    exit /b 1
)

echo [INFO] Java version:
java -version 2>&1 | findstr "version"
echo.

REM Create output directory if not exists
if not exist "bin" mkdir bin

echo [INFO] Compiling Java files...
javac -encoding UTF-8 -d bin *.java

if errorlevel 1 (
    echo [ERROR] Compilation failed!
    pause
    exit /b 1
)

echo [INFO] Compilation successful!
echo.
echo [INFO] Starting game...
echo [INFO] Controls: Enter/Space=Start, K=Shoot, L=Missile, P=Pause, ESC=Pause/Resume
echo.

REM Run from parent directory to access static resources
cd ..
java -cp for_java/bin Start

echo.
echo [INFO] Game closed.
pause
