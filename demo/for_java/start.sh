#!/bin/bash

echo "========================================"
echo "  LegendsNeverDie - Java Game Launcher"
echo "========================================"
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "[ERROR] Java is not installed or not in PATH"
    echo "Please install Java 8 or higher"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[INFO] Java version:"
java -version 2>&1 | head -n 1
echo ""

# Create output directory if not exists
mkdir -p bin

echo "[INFO] Compiling Java files..."
javac -encoding UTF-8 -d bin *.java

if [ $? -ne 0 ]; then
    echo "[ERROR] Compilation failed!"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[INFO] Compilation successful!"
echo ""
echo "[INFO] Starting game..."
echo "[INFO] Controls: Enter/Space=Start, K=Shoot, L=Missile, P=Pause, ESC=Pause/Resume"
echo ""

# Run from parent directory to access static resources
cd ..
java -cp for_java/bin Start

echo ""
echo "[INFO] Game closed."
read -p "Press Enter to exit..."
