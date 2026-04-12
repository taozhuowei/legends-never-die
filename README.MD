# Legends Never Die

横版跑酷射击游戏 - Java版 + Web版

## 项目结构

```
LegendsNeverDie/
├── for_java/              # Java核心代码
│   └── game/
│       ├── Start.java     # 游戏主类
│       ├── Hero.java      # 主角类
│       ├── Enemy.java     # 敌人类
│       ├── Boss.java      # Boss类
│       ├── Bullet.java    # 子弹类
│       ├── Missile.java   # 导弹类
│       └── ...
│
├── static/images/         # 公共静态资源
│   ├── hero*.png          # 角色精灵图
│   ├── enemy*.png         # 敌人精灵图
│   ├── background.png     # 背景图
│   └── ...
│
└── for_web/               # Web版游戏
    ├── index.html         # 游戏入口
    ├── css/style.css      # 响应式样式
    ├── js/                # 游戏逻辑脚本
    ├── server.py          # Python服务器
    ├── start.bat          # Windows启动脚本
    ├── start.sh           # Linux/Mac启动脚本
    └── package.json       # Node配置
```

## 启动方式

### Java版
```bash
cd for_java
javac game/*.java
java game.Start
```

**操作方式：**
| 操作 | 按键 |
|------|------|
| 开始游戏 | 回车 / 空格 |
| 跳跃 | 空格 |
| 射击 | K |
| 导弹 | L |
| 暂停/继续 | P / ESC |

### Web版

#### 方式1：一键启动（推荐）
```bash
cd for_web

# Windows
start.bat

# Linux/Mac
./start.sh
```

#### 方式2：Python服务器
```bash
cd for_web
python server.py
# 或指定端口
python server.py 3000
```

#### 方式3：Node.js服务器
```bash
cd for_web
npm install
npm start
```

#### 方式4：VS Code Live Server
在 VS Code 中安装 Live Server 插件，右键 `index.html` → "Open with Live Server"

访问地址：`http://localhost:8080`

**操作方式：**
| 操作 | 桌面端 | 移动端 |
|------|--------|--------|
| 跳跃 | 空格 | 跳跃按钮 |
| 射击 | K | 射击按钮 |
| 导弹 | L | 导弹按钮 |
| 暂停/继续 | P / ESC | - |

## 游戏特性

- 横版自动跑酷，背景无缝滚动
- 物理抛物线跳跃
- 射击系统（单发/连发/导弹）
- 随机生成陷阱、敌人、Boss
- 击败敌人获得经验升级
- 升级随机BUFF奖励：
  - 火力增强（子弹连发）
  - 飞行模式（10秒无敌）
  - 导弹装备
  - 护盾
  - 额外生命
- 响应式设计，支持桌面和移动设备
