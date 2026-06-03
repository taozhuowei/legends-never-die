import java.awt.*;
import java.awt.event.*;
import java.awt.image.*;
import java.io.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Random;
import java.util.Timer;
import java.util.TimerTask;
import javax.imageio.ImageIO;
import javax.swing.*;

/**
 * Legends Never Die - 主游戏类
 * 优化版本：移除未使用导入，优化资源加载，简化代码逻辑
 */
public class Start extends JPanel {
    /* 窗口尺寸 */
    public static final int WIDTH = 1024;
    public static final int HEIGHT = 560;
    
    /* 游戏状态 */
    private int state = 0; // 0=开始, 1=进行中, 2=暂停, 3=结束
    
    /* 游戏状态图片 */
    public static BufferedImage start;
    public static BufferedImage pause;
    public static BufferedImage gameover;
    
    /* 背景 */
    public static BufferedImage background;
    public int bgXPosition = 0;
    public static int speed = 5;
    public static int lastSpeed = 5;
    
    /* GUI 图片 */
    public static BufferedImage milepostImg;
    public static BufferedImage lifeImg;
    public static BufferedImage missileCountImg;
    public static BufferedImage expImg;
    public static BufferedImage shieldCountImg;
    public static BufferedImage fireUpCountImg;
    
    /* 角色图片 */
    public static BufferedImage heroImg1, heroImg2, heroImg3, heroImg4, heroImg5;
    public static BufferedImage heroFlyImg;
    public Hero hero = new Hero();
    
    /* 敌人图片 */
    public static BufferedImage enemyImg1, enemyImg2, enemyImg3, enemyImg4, enemyImg5;
    public static BufferedImage bossImg;
    
    /* 道具图片 */
    public static BufferedImage obstacleImg;
    public static BufferedImage bulletImg;
    public static BufferedImage missileOfHeroImg;
    public static BufferedImage missileOfBossImg;
    public static BufferedImage shieldImg;
    public static BufferedImage bangImg;
    
    /* BUFF 图片 */
    public static BufferedImage buffFireUp, buffAddLife, buffShield, buffMissile, buffFly;
    public static BufferedImage guide;
    
    /* 游戏对象 */
    private final List<Bullet> bullets = new ArrayList<>();
    private final List<BossMissile> missilesOfBoss = new ArrayList<>();
    private final List<MovableObject> generators = new ArrayList<>();
    
    /* 游戏数据 */
    private int meters = 0;
    private int index = 0;
    private int generatorIndex = 0;
    private final List<Integer> positions = new ArrayList<>();
    public String buff = " ";
    
    /* 计时器 */
    private Timer timer;
    private TimerTask timerTask;
    private static final int INTERVAL = 10;
    
    /* 射击冷却 */
    public static long lastTime = 0;
    
    /* 音频管理器 */
    private final AudioManager audioManager = AudioManager.getInstance();

    public Start() {}

    /**
     * 加载图片资源 - 支持 JAR 内资源和文件系统
     */
    private static BufferedImage loadImage(String filename) {
        try {
            // 尝试从 JAR/类路径加载
            InputStream is = Start.class.getResourceAsStream("/static/images/" + filename);
            if (is != null) {
                try {
                    return ImageIO.read(is);
                } finally {
                    is.close();
                }
            }
            
            // 回退到文件系统
            String[] paths = {
                "../static/images/" + filename,
                "static/images/" + filename,
                "./static/images/" + filename
            };
            
            for (String path : paths) {
                File file = new File(path);
                if (file.exists()) {
                    return ImageIO.read(file);
                }
            }
            
            System.err.println("无法加载图片: " + filename);
            return null;
        } catch (IOException e) {
            System.err.println("加载图片失败: " + filename);
            e.printStackTrace();
            return null;
        }
    }

    /* 静态初始化块 - 加载所有资源 */
    static {
        loadAllImages();
    }
    
    private static void loadAllImages() {
        /* 游戏状态 */
        start = loadImage("start.png");
        pause = loadImage("pause.png");
        gameover = loadImage("gameover.png");
        
        /* 背景 */
        background = loadImage("background.png");
        
        /* 英雄 */
        heroImg1 = loadImage("hero (1).png");
        heroImg2 = loadImage("hero (2).png");
        heroImg3 = loadImage("hero (3).png");
        heroImg4 = loadImage("hero (4).png");
        heroImg5 = loadImage("hero (5).png");
        heroFlyImg = loadImage("hero-fly.png");
        
        /* GUI */
        milepostImg = loadImage("milepost.png");
        lifeImg = loadImage("life.png");
        missileCountImg = loadImage("missile-count.png");
        expImg = loadImage("exp.png");
        shieldCountImg = loadImage("shield-count.png");
        fireUpCountImg = loadImage("fire-up.png");
        guide = loadImage("guide.png");
        
        /* 生成物 */
        obstacleImg = loadImage("obstacle.png");
        enemyImg1 = loadImage("enemy (1).png");
        enemyImg2 = loadImage("enemy (2).png");
        enemyImg3 = loadImage("enemy (3).png");
        enemyImg4 = loadImage("enemy (4).png");
        enemyImg5 = loadImage("enemy (5).png");
        bossImg = loadImage("boss.png");
        
        /* 道具 */
        bulletImg = loadImage("bullet.png");
        missileOfBossImg = loadImage("missile-of-boss.png");
        missileOfHeroImg = loadImage("missile-of-hero.png");
        shieldImg = loadImage("shield.png");
        bangImg = loadImage("bang.png");
        
        /* BUFF */
        buffFireUp = loadImage("buff-fire-up.png");
        buffAddLife = loadImage("buff-add-life.png");
        buffShield = loadImage("buff-shield.png");
        buffFly = loadImage("buff-fly.png");
        buffMissile = loadImage("buff-missile.png");
    }

    /* ========== 游戏行为 ========== */
    
    /* 背景滚动 */
    public void bgScroll() {
        bgXPosition -= speed;
        if (bgXPosition < -512) {
            bgXPosition = 0;
        }
    }
    
    /* 英雄跑动 */
    public void heroRun() {
        hero.move();
    }
    
    /* 坐标随地图移动 */
    public void moveXWithMap() {
        for (int i = positions.size() - 1; i >= 0; i--) {
            positions.set(i, positions.get(i) - speed);
            if (positions.get(i) < -200) {
                positions.remove(i);
            }
        }
    }
    
    /* 生成物随地图移动 */
    public void moveWithMap() {
        Iterator<MovableObject> it = generators.iterator();
        while (it.hasNext()) {
            MovableObject obj = it.next();
            obj.move();
            if (obj.x < -200) {
                it.remove();
            }
        }
    }
    
    /* 子弹移动 */
    public void moveBullets() {
        Iterator<Bullet> it = bullets.iterator();
        while (it.hasNext()) {
            Bullet b = it.next();
            b.move();
            if (b.x > WIDTH) {
                it.remove();
            }
        }
    }
    
    /* 敌方导弹移动 */
    public void moveMissile() {
        Iterator<BossMissile> it = missilesOfBoss.iterator();
        while (it.hasNext()) {
            BossMissile m = it.next();
            m.move();
            if (m.x < -200) {
                it.remove();
            }
        }
    }

    /* ========== 游戏逻辑 ========== */
    
    /* 计算里程 */
    public void getMeters() {
        if (state == 1) {
            index++;
            if (index % 100 == 0 && index != 1) {
                meters += speed;
            }
        }
    }
    
    /* 随机生成 X 坐标 */
    public int generateXPosition() {
        Random random = new Random();
        int xPosition = random.nextInt(2500) + WIDTH;
        
        for (int pos : positions) {
            if (Math.abs(pos - xPosition) <= 500) {
                return 0;
            }
        }
        
        positions.add(xPosition);
        return xPosition;
    }
    
    /* 生成敌人和陷阱 */
    public void generator() {
        generatorIndex++;
        if (generatorIndex % 10 != 0) return;
        
        int probability = 10;
        int type = new Random().nextInt(probability + 1);
        int x = generateXPosition();
        
        if (x == 0) return;
        
        if (type == probability) {
            // 生成 Boss
            Boss boss = new Boss(x);
            generators.add(boss);
            missilesOfBoss.add(boss.fireMissile());
            audioManager.playBossAppearSound();
        } else if (type % 2 == 0) {
            // 生成陷阱
            generators.add(new Obstacle(x));
        } else {
            // 生成敌人
            generators.add(new Enemy(x));
            audioManager.playEnemyAppearSound();
        }
    }
    
    /* 随机奖励 */
    public void getRandomAward() {
        int buffType = new Random().nextInt(50);
        
        if (buffType <= 10) {
            buff = "fireUp";
            hero.fireUpCount();
        } else if (buffType <= 20) {
            buff = "fly";
            hero.ableToFly = true;
        } else if (buffType <= 30) {
            buff = "equipMissile";
            hero.equipMissile();
        } else if (buffType <= 40) {
            buff = "equipShield";
            hero.getShield();
        } else {
            buff = "addLife";
            hero.addLife();
        }
        
        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                buff = " ";
            }
        }, 1000);
    }

    /* ========== 碰撞检测 ========== */
    
    /* 子弹碰撞 */
    public void bulletHitAction() {
        for (int i = bullets.size() - 1; i >= 0; i--) {
            Bullet bullet = bullets.get(i);
            int hitIndex = -1;
            
            for (int j = 0; j < generators.size(); j++) {
                MovableObject target = generators.get(j);
                if (target instanceof Obstacle) continue;
                
                if (bullet.x + bullet.width >= target.x + target.width / 2) {
                    hitIndex = j;
                    break;
                }
            }
            
            if (hitIndex != -1) {
                generators.get(hitIndex).life -= bullet.damage;
                bullets.remove(i);
                isEnemyAlive(hitIndex);
            }
        }
    }
    
    /* 主角碰撞 */
    public void heroHitAction() {
        int x = hero.x + hero.width;
        int y = hero.y + hero.height;
        
        if (isHitByGenerators(x, y) || isHitByMissile(x, y)) {
            hero.setHitEffect();
            audioManager.playHitSound();
            if (hero.shield > 0) {
                hero.shield--;
            } else {
                hero.life--;
            }
        }
    }
    
    /* 检测与生成物碰撞 */
    public boolean isHitByGenerators(int x, int y) {
        for (int i = generators.size() - 1; i >= 0; i--) {
            MovableObject obj = generators.get(i);
            if (x >= obj.x && x <= obj.x + obj.width && y >= obj.y) {
                speed = 0;
                generators.remove(i);
                
                new Timer().schedule(new TimerTask() {
                    @Override
                    public void run() {
                        speed = 5;
                    }
                }, 1000);
                return true;
            }
        }
        return false;
    }
    
    /* 检测与导弹碰撞 */
    public boolean isHitByMissile(int x, int y) {
        for (int i = missilesOfBoss.size() - 1; i >= 0; i--) {
            BossMissile missile = missilesOfBoss.get(i);
            if (x >= missile.x && y >= missile.y) {
                speed = 0;
                missilesOfBoss.remove(i);
                
                new Timer().schedule(new TimerTask() {
                    @Override
                    public void run() {
                        speed = 5;
                    }
                }, 500);
                return true;
            }
        }
        return false;
    }
    
    /* 敌机爆炸 */
    public void enemyExplosion(int i) {
        final MovableObject enemy = generators.get(i);
        enemy.images = new BufferedImage[]{bangImg};
        enemy.image = bangImg;
        
        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                generators.remove(enemy);
            }
        }, 60);
    }
    
    /* 判断敌人是否死亡 */
    public void isEnemyAlive(int i) {
        if (generators.get(i).life <= 0) {
            int lastLevel = hero.level;
            hero.getExp(generators.get(i).getExp());
            enemyExplosion(i);
            if (hero.level > lastLevel) {
                getRandomAward();
            }
        }
    }

    /* ========== 绘制方法 ========== */
    
    @Override
    public void paint(Graphics g) {
        super.paint(g);
        
        // 背景
        g.drawImage(background, bgXPosition, 0, null);
        
        // 游戏状态
        paintByState(g);
        
        // GUI
        paintGUI(g);
        
        // 主角
        paintHero(g);
        
        // 生成物
        paintGenerators(g);
        
        // 子弹
        paintBullets(g);
        
        // 敌方导弹
        paintMissiles(g);
        
        // BUFF
        paintBuff(g);
        
        // 操作提示
        paintGuideInfo(g);
    }
    
    public void paintByState(Graphics g) {
        switch (state) {
            case 0 -> g.drawImage(start, 384, 216, null);
            case 2 -> g.drawImage(pause, 482, 50, null);
            case 3 -> g.drawImage(gameover, 379, 244, null);
        }
    }
    
    public void paintGUI(Graphics g) {
        g.setFont(new Font("楷体", Font.BOLD, 20));
        
        // 里程
        g.drawImage(milepostImg, 20, 20, null);
        g.drawString(String.valueOf(meters), 60, 50);
        
        // 生命值
        int startX = 850;
        for (int i = 0; i < hero.life; i++) {
            g.drawImage(lifeImg, startX, 20, null);
            startX += 40;
        }
        
        // 等级
        g.drawImage(expImg, 20, 60, null);
        g.drawString(String.valueOf(hero.level), 60, 80);
        
        // 导弹数量
        g.drawImage(missileCountImg, 850, 60, null);
        g.drawString(String.valueOf(hero.missile), 880, 80);
        
        // 火力增强
        g.drawImage(fireUpCountImg, 850, 90, null);
        g.drawString(String.valueOf(hero.fireUpCount), 880, 110);
        
        // 护盾
        int shieldX = 850;
        for (int j = 0; j < hero.shield; j++) {
            g.drawImage(shieldCountImg, shieldX, 20, null);
            shieldX += 40;
        }
    }
    
    public void paintGuideInfo(Graphics g) {
        g.drawImage(guide, 262, 10, null);
    }
    
    public void paintBuff(Graphics g) {
        BufferedImage buffImg = switch (buff) {
            case "fireUp" -> buffFireUp;
            case "addLife" -> buffAddLife;
            case "equipShield" -> buffShield;
            case "equipMissile" -> buffMissile;
            case "fly" -> buffFly;
            default -> null;
        };
        
        if (buffImg != null) {
            g.drawImage(buffImg, 412, 50, null);
        }
    }
    
    public void paintHero(Graphics g) {
        if (hero.isHit) {
            g.drawImage(hero.image, hero.x, hero.y, null);
            g.setColor(new Color(255, 0, 0, 128));
            g.fillRect(hero.x, hero.y, hero.width, hero.height);
        } else {
            g.drawImage(hero.image, hero.x, hero.y, null);
        }
        
        if (hero.shield > 0) {
            int shieldX = (hero.isJumping || hero.isFlying) ? hero.x + 50 : hero.x - 20;
            g.drawImage(shieldImg, shieldX, hero.y - 20, null);
        }
    }
    
    public void paintGenerators(Graphics g) {
        for (MovableObject obj : generators) {
            g.drawImage(obj.image, obj.x, obj.y, null);
        }
    }
    
    public void paintBullets(Graphics g) {
        for (Bullet b : bullets) {
            g.drawImage(b.image, b.x, b.y, null);
        }
    }
    
    public void paintMissiles(Graphics g) {
        for (BossMissile m : missilesOfBoss) {
            g.drawImage(missileOfBossImg, m.x, m.y, null);
        }
    }

    /* ========== 游戏控制 ========== */
    
    public void startGame() {
        if (state != 1) {
            state = 1;
            speed = lastSpeed;
            meters = 0;
            audioManager.playBackgroundMusic();
        }
    }
    
    public void pauseGame() {
        if (state == 1) {
            lastSpeed = speed;
            speed = 0;
            state = 2;
            audioManager.pauseBackgroundMusic();
        }
    }
    
    public void resumeGame() {
        if (state == 2) {
            speed = lastSpeed;
            state = 1;
            audioManager.resumeBackgroundMusic();
        }
    }
    
    public void jumpOrFly() {
        if (hero.ableToFly) {
            hero.increaseSpeedAndFly();
        } else if (!hero.isJumping) {
            hero.jump();
            audioManager.playJumpSound();
        }
    }
    
    public void attack() {
        long thisTime = System.currentTimeMillis();
        if (thisTime - lastTime <= 500) return;
        
        lastTime = thisTime;
        audioManager.playShootSound();
        
        if (hero.fireUpCount > 0) {
            bullets.addAll(Arrays.asList(hero.continuousShoot()));
        } else {
            bullets.add(hero.shoot());
        }
    }
    
    public void fireMissile() {
        if (hero.missile <= 0) return;
        
        long thisTime = System.currentTimeMillis();
        if (thisTime - lastTime <= 1500) return;
        
        lastTime = thisTime;
        bullets.add(hero.fireMissile());
        audioManager.playMissileSound();
    }
    
    public void initBeforeGameStart() {
        if (state == 0) {
            speed = 0;
            meters = 0;
        }
    }
    
    public void checkIsGameOver() {
        if (hero.life > 0) return;
        
        state = 3;
        speed = 0;
        meters = 0;
        audioManager.stopBackgroundMusic();
        audioManager.playGameOverSound();
        
        // 重置游戏
        hero = new Hero();
        generators.clear();
        bullets.clear();
        missilesOfBoss.clear();
        
        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                state = 0;
            }
        }, 1000);
    }

    /* ========== 游戏主循环 ========== */
    
    public void action() {
        // 初始化音频
        audioManager.init();
        
        // 键盘监听
        KeyAdapter keyAdapter = new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                int keyCode = e.getKeyCode();
                char keyChar = Character.toLowerCase(e.getKeyChar());
                
                // 回车或空格：开始游戏
                if ((keyCode == KeyEvent.VK_ENTER || keyCode == KeyEvent.VK_SPACE) && state == 0) {
                    startGame();
                    return;
                }
                
                // P 键或 ESC：暂停/继续
                if (keyChar == 'p' || keyCode == KeyEvent.VK_ESCAPE) {
                    if (state == 1) {
                        pauseGame();
                    } else if (state == 2) {
                        resumeGame();
                    }
                    return;
                }
                
                // 游戏进行中的操作
                if (state == 1) {
                    switch (keyCode) {
                        case KeyEvent.VK_SPACE -> jumpOrFly();
                        case KeyEvent.VK_K -> attack();
                        case KeyEvent.VK_L -> fireMissile();
                    }
                }
            }
        };
        addKeyListener(keyAdapter);
        
        // 鼠标监听
        MouseAdapter mouseAdapter = new MouseAdapter() {
            @Override
            public void mouseExited(MouseEvent e) {
                if (state == 1) {
                    lastSpeed = speed;
                    state = 2;
                    speed = 0;
                }
            }
            
            @Override
            public void mouseEntered(MouseEvent e) {
                if (state == 2) {
                    state = 1;
                    speed = lastSpeed;
                }
            }
        };
        addMouseListener(mouseAdapter);
        
        // 游戏循环定时器
        timer = new Timer();
        timerTask = new TimerTask() {
            @Override
            public void run() {
                initBeforeGameStart();
                checkIsGameOver();
                bgScroll();
                heroRun();
                getMeters();
                generator();
                moveWithMap();
                moveXWithMap();
                moveBullets();
                moveMissile();
                bulletHitAction();
                heroHitAction();
                repaint();
            }
        };
        timer.schedule(timerTask, INTERVAL, INTERVAL);
        
        requestFocus();
    }

    /* ========== 主方法 ========== */
    
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Legends Never Die");
            Start game = new Start();
            frame.add(game);
            frame.setSize(WIDTH, HEIGHT);
            frame.setLocationRelativeTo(null);
            frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
            frame.setResizable(false);
            frame.setVisible(true);
            game.action();
        });
    }
}