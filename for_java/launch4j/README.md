# Legends Never Die - 打包说明

## 打包工具说明

本目录包含使用 Launch4j 将 Java 游戏打包为 Windows 可执行文件（.exe）的配置和脚本。

## 文件说明

| 文件 | 说明 |
|------|------|
| `launch4j.xml` | Launch4j 配置文件，定义 EXE 生成参数 |
| `package-exe.bat` | 一键打包脚本，自动完成所有打包步骤 |
| `README.md` | 本说明文件 |

## 快速开始

### 方法一：一键打包（推荐）

```batch
# 在命令行中执行
cd for_java\launch4j
package-exe.bat
```

脚本会自动完成：
1. 下载并安装 Launch4j（如未安装）
2. 编译所有 Java 源文件
3. 打包 JAR 文件
4. 复制静态资源（图片、音频）
5. 生成应用程序图标
6. 生成最终的 EXE 文件

### 方法二：手动打包

#### 1. 编译 Java 代码

```batch
cd for_java
javac -encoding UTF-8 -d bin *.java
```

#### 2. 打包 JAR

```batch
cd bin
echo Main-Class: Start> manifest.txt
jar cvfm LegendsNeverDie.jar manifest.txt *.class
```

#### 3. 下载 Launch4j

- 访问：https://sourceforge.net/projects/launch4j/
- 下载并解压到 `for_java/launch4j/tools/` 目录

#### 4. 生成 EXE

```batch
cd for_java\launch4j
tools\launch4j.exe launch4j.xml
```

## 配置说明

### launch4j.xml 关键配置

```xml
<!-- 基本信息 -->
<jar>LegendsNeverDie.jar</jar>          <!-- 输入 JAR 文件 -->
<outfile>LegendsNeverDie.exe</outfile>  <!-- 输出 EXE 文件 -->
<icon>app.ico</icon>                     <!-- 应用程序图标 -->

<!-- JRE 要求 -->
<minVersion>1.8.0</minVersion>           <!-- 最低 Java 版本 -->
<initialHeapSize>128</initialHeapSize>   <!-- 初始堆内存 (MB) -->
<maxHeapSize>512</maxHeapSize>           <!-- 最大堆内存 (MB) -->
```

## 输出目录结构

打包完成后，`for_java/release/` 目录结构如下：

```
release/
├── LegendsNeverDie.exe      # 可执行文件
├── LegendsNeverDie.jar      # JAR 文件（已嵌入 EXE 中）
└── static/
    ├── images/              # 游戏图片资源
    │   ├── hero.png
    │   ├── enemy.png
    │   └── ...
    └── audio/               # 游戏音频资源
        ├── bgm.wav
        ├── shoot.wav
        └── ...
```

## 运行要求

- **操作系统**: Windows 7/8/10/11
- **Java 版本**: Java 8 (1.8.0) 或更高版本
- **内存**: 至少 256MB 可用内存

## 常见问题

### Q: 运行时提示 "未找到 Java 运行时环境"

A: 请安装 Java 8 或更高版本：
- 推荐：[Eclipse Temurin](https://adoptium.net/)
- 备用：[Oracle Java](https://www.oracle.com/java/technologies/downloads/)

### Q: 如何修改 JAR 文件内的资源？

A: JAR 文件内的资源优先级低于外部资源。将修改后的资源放在 `release/static/` 目录下即可覆盖 JAR 内的资源。

### Q: 如何调整游戏窗口大小？

A: 修改 `Start.java` 中的 `WIDTH` 和 `HEIGHT` 常量，然后重新打包。

### Q: Launch4j 下载失败怎么办？

A: 手动下载并解压：
1. 访问 https://sourceforge.net/projects/launch4j/files/
2. 下载 `launch4j-3.50-win32.zip`
3. 解压到 `for_java/launch4j/tools/` 目录

## 优化建议

1. **使用 ProGuard 压缩 JAR**
   ```batch
   # 在打包前使用 ProGuard 混淆代码，减小体积
   java -jar proguard.jar @proguard.cfg
   ```

2. **使用 UPX 压缩 EXE**
   ```batch
   # 使用 UPX 进一步压缩生成的 EXE
   upx --best LegendsNeverDie.exe
   ```

3. **资源优化**
   - 压缩图片：使用 TinyPNG 等工具压缩 PNG 图片
   - 音频转换：将 WAV 转换为 OGG 减小体积

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024 | 初始版本 |

## 许可证

本项目采用 MIT 许可证。详见项目根目录 LICENSE 文件。