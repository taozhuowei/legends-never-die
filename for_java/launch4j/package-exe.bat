@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ==========================================
echo  Legends Never Die - 游戏打包工具
echo ==========================================
echo.

:: 设置路径
set "PROJECT_ROOT=%~dp0.."
set "LAUNCH4J_DIR=%~dp0tools"
set "LAUNCH4J_ZIP=%TEMP%\launch4j.zip"
set "RELEASE_DIR=%PROJECT_ROOT%\release"
set "BIN_DIR=%PROJECT_ROOT%\bin"

:: Launch4j 版本
set "LAUNCH4J_VERSION=3.50"
set "LAUNCH4J_URL=https://sourceforge.net/projects/launch4j/files/launch4j-3/3.50/launch4j-3.50-win32.zip/download"

echo [1/6] 检查 Launch4j ...
if exist "%LAUNCH4J_DIR%\launch4j.exe" (
    echo      Launch4j 已存在，跳过下载
) else (
    echo      下载 Launch4j ...
    if not exist "%LAUNCH4J_DIR%" mkdir "%LAUNCH4J_DIR%"
    
    :: 尝试使用 PowerShell 下载
    powershell -Command "try { Invoke-WebRequest -Uri '%LAUNCH4J_URL%' -OutFile '%LAUNCH4J_ZIP%' -MaximumRedirection 5 } catch { exit 1 }" 2>nul
    
    if exist "%LAUNCH4J_ZIP%" (
        echo      解压 Launch4j ...
        powershell -Command "Expand-Archive -Path '%LAUNCH4J_ZIP%' -DestinationPath '%LAUNCH4J_DIR%' -Force"
        
        :: 移动文件到正确位置
        if exist "%LAUNCH4J_DIR%\launch4j" (
            xcopy /E /Y "%LAUNCH4J_DIR%\launch4j\*" "%LAUNCH4J_DIR%\" >nul 2>&1
            rmdir /S /Q "%LAUNCH4J_DIR%\launch4j" 2>nul
        )
        
        del "%LAUNCH4J_ZIP%" 2>nul
        echo      Launch4j 安装完成
    ) else (
        echo      警告：无法自动下载 Launch4j
        echo      请手动下载并解压到：%LAUNCH4J_DIR%
        echo      下载地址：https://sourceforge.net/projects/launch4j/
        pause
        exit /b 1
    )
)

echo.
echo [2/6] 编译 Java 代码 ...
cd /d "%PROJECT_ROOT%"

:: 检查是否有 Java 文件需要编译
set "NEED_COMPILE=0"
for %%f in (*.java) do (
    if not exist "bin\%%~nf.class" (
        set "NEED_COMPILE=1"
    ) else (
        forfiles /P "%PROJECT_ROOT%" /M "%%f" /C "cmd /c if @fdate gtr %BIN_DIR%\%%~nf.class set NEED_COMPILE=1" 2>nul
    )
)

if "%NEED_COMPILE%"=="1" (
    echo      正在编译 ...
    if not exist bin mkdir bin
    
    :: 编译所有 Java 文件
    javac -encoding UTF-8 -d bin *.java 2>&1
    
    if errorlevel 1 (
        echo      错误：编译失败！
        pause
        exit /b 1
    )
    echo      编译完成
) else (
    echo      所有文件已是最新，跳过编译
)

echo.
echo [3/6] 打包 JAR 文件 ...

cd /d "%BIN_DIR%"

:: 创建 manifest 文件
echo Main-Class: Start> manifest.txt
echo Class-Path: .>> manifest.txt

:: 打包 JAR
jar cvfm LegendsNeverDie.jar manifest.txt *.class >nul 2>&1

if not exist "LegendsNeverDie.jar" (
    echo      错误：JAR 打包失败！
    pause
    exit /b 1
)

echo      JAR 打包完成

echo.
echo [4/6] 复制资源文件 ...

:: 创建发布目录
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"
if not exist "%RELEASE_DIR%\static\images" mkdir "%RELEASE_DIR%\static\images"
if not exist "%RELEASE_DIR%\static\audio" mkdir "%RELEASE_DIR%\static\audio"

:: 复制 JAR
copy /Y "LegendsNeverDie.jar" "%RELEASE_DIR%\" >nul

:: 复制静态资源
xcopy /E /Y "%PROJECT_ROOT%\..\static\images\*" "%RELEASE_DIR%\static\images\" >nul 2>&1
xcopy /E /Y "%PROJECT_ROOT%\..\static\audio\*" "%RELEASE_DIR%\static\audio\" >nul 2>&1

echo      资源复制完成

echo.
echo [5/6] 生成图标 ...

:: 检查是否存在图标
if not exist "app.ico" (
    :: 尝试从静态资源生成简单图标
    if exist "%PROJECT_ROOT%\..\static\images\hero-fly.png" (
        echo      使用 hero-fly.png 作为图标基础
        copy /Y "%PROJECT_ROOT%\..\static\images\hero-fly.png" "%RELEASE_DIR%\app.png" >nul
    )
    
    :: 尝试使用 ImageMagick 转换（如果已安装）
    where magick >nul 2>&1
    if %errorlevel% == 0 (
        magick convert "%RELEASE_DIR%\app.png" -resize 256x256 "%RELEASE_DIR%\app.ico" 2>nul
    )
    
    :: 如果没有图标生成，使用空图标
    if not exist "%RELEASE_DIR%\app.ico" (
        echo      警告：未找到图标，将使用默认图标
        :: 创建一个空图标占位
        type nul > "%RELEASE_DIR%\app.ico" 2>nul
    )
) else (
    copy /Y "app.ico" "%RELEASE_DIR%\" >nul
)

echo.
echo [6/6] 生成 EXE 文件 ...

:: 复制配置文件
copy /Y "%~dp0launch4j.xml" "%RELEASE_DIR%\" >nul

:: 运行 Launch4j
cd /d "%RELEASE_DIR%"

"%LAUNCH4J_DIR%\launch4j.exe" launch4j.xml

if errorlevel 1 (
    echo      错误：EXE 生成失败！
    pause
    exit /b 1
)

echo      EXE 生成完成

echo.
echo ==========================================
echo  打包完成！
echo ==========================================
echo.
echo 输出文件：
echo   - %RELEASE_DIR%\LegendsNeverDie.exe
echo   - %RELEASE_DIR%\LegendsNeverDie.jar
echo   - %RELEASE_DIR%\static\images\ (游戏图片)
echo   - %RELEASE_DIR%\static\audio\ (游戏音效)
echo.
echo 运行方式：
echo   1. 直接运行 LegendsNeverDie.exe
echo   2. 双击即可启动游戏
echo.
echo 注意：需要安装 Java 8 或更高版本
echo.

:: 清理临时文件
del "%RELEASE_DIR%\launch4j.xml" 2>nul
del "%RELEASE_DIR%\app.ico" 2>nul

pause