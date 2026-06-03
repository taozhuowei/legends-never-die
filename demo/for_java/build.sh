#!/bin/bash

echo "========================================"
echo "  LegendsNeverDie - Build Script (Linux/macOS)"
echo "========================================"
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "[ERROR] Java is not installed or not in PATH"
    exit 1
fi

echo "[INFO] Cleaning old builds..."
rm -rf bin dist LegendsNeverDie.jar

mkdir -p bin dist

echo "[INFO] Compiling Java files..."
javac -encoding UTF-8 -d bin *.java

if [ $? -ne 0 ]; then
    echo "[ERROR] Compilation failed!"
    exit 1
fi

echo "[INFO] Creating JAR file..."
cd bin
echo "Main-Class: Start" > manifest.txt
echo "Class-Path: ." >> manifest.txt
jar cvfm ../dist/LegendsNeverDie.jar manifest.txt *.class
cd ..

echo "[INFO] Copying resources..."
cp -r ../static dist/ 2>/dev/null || true

echo ""
echo "========================================"
echo "  Build successful!"
echo "========================================"
echo ""
echo "Output files:"
echo "  - dist/LegendsNeverDie.jar"
echo "  - dist/static/ (resources)"
echo ""
echo "To run the game:"
echo "  cd dist"
echo "  java -jar LegendsNeverDie.jar"
echo ""
