@echo off
chcp 65001 >nul
echo ========================================
echo  LegendsNeverDie - Build Script (Windows)
echo ========================================
echo.

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java is not installed or not in PATH
    pause
    exit /b 1
)

echo [INFO] Cleaning old builds...
if exist "bin" rmdir /s /q bin
if exist "dist" rmdir /s /q dist
if exist "LegendsNeverDie.jar" del LegendsNeverDie.jar

mkdir bin
mkdir dist

echo [INFO] Compiling Java files...
javac -encoding UTF-8 -d bin *.java

if errorlevel 1 (
    echo [ERROR] Compilation failed!
    pause
    exit /b 1
)

echo [INFO] Creating JAR file...
cd bin
echo Main-Class: Start > manifest.txt
echo Class-Path: . >> manifest.txt
jar cvfm ../dist/LegendsNeverDie.jar manifest.txt *.class
cd ..

echo [INFO] Copying resources...
xcopy /E /I /Y ..\static dist\static 2>nul

echo.
echo ========================================
echo  Build successful!
echo ========================================
echo.
echo Output files:
echo   - dist/LegendsNeverDie.jar
echo   - dist/static/ (resources)
echo.
echo To run the game:
echo   cd dist
echo   java -jar LegendsNeverDie.jar
echo.

pause
