import java.awt.image.BufferedImage;
import java.util.Timer;
import java.util.TimerTask;

/**
 * 英雄类 - 玩家控制的角色
 * 优化版本：移除未使用的导入，简化代码逻辑
 */
public class Hero extends MovableObject {
    private int index;
    private final int jumpHeight;
    private final double jumpVelocity;
    private final double gravity;
    private Timer jumpTimer;
    
    public int missile;
    public boolean isHit;
    private Timer hitTimer;
    public int fireUpCount;
    public int shield;
    public int level;
    public int fireLevel;
    public int expRequire;
    public boolean isJumping;
    public boolean ableToFly;
    public boolean isFlying;

    public Hero() {
        this.images = new BufferedImage[]{
            Start.heroImg1,
            Start.heroImg2,
            Start.heroImg3,
            Start.heroImg4,
            Start.heroImg5
        };
        this.index = 0;
        this.image = this.images[0];
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.x = 50;
        this.y = 400;
        this.life = 3;
        this.level = 1;
        this.expRequire = 10;
        this.jumpHeight = 150;
        this.jumpVelocity = -11;
        this.gravity = 0.35;
        this.fireUpCount = 0;
        this.missile = 0;
        this.shield = 0;
        this.fireLevel = 1;
        this.isJumping = false;
        this.ableToFly = false;
        this.isFlying = false;
        this.isHit = false;
    }

    /* 设置受击效果 */
    public void setHitEffect() {
        this.isHit = true;
        if (this.hitTimer != null) {
            this.hitTimer.cancel();
        }
        this.hitTimer = new Timer();
        this.hitTimer.schedule(new TimerTask() {
            @Override
            public void run() {
                Hero.this.isHit = false;
                Hero.this.hitTimer = null;
            }
        }, 300);
    }

    /* 跑动动画 */
    @Override
    public void move() {
        if (Start.speed != 0 && !this.isJumping && !this.isFlying) {
            int num = this.index++ / 10 % this.images.length;
            this.image = this.images[num];
        }
    }

    /* 跳跃 - 物理抛物线运动 */
    public void jump() {
        if (this.isJumping) return;
        
        this.isJumping = true;
        this.image = Start.heroFlyImg;
        final double[] vy = {this.jumpVelocity};
        
        if (this.jumpTimer != null) {
            this.jumpTimer.cancel();
        }
        
        this.jumpTimer = new Timer();
        this.jumpTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                vy[0] += gravity;
                Hero.this.y += (int) vy[0];
                
                if (Hero.this.y >= 400) {
                    Hero.this.y = 400;
                    Hero.this.image = Hero.this.images[0];
                    Hero.this.isJumping = false;
                    Hero.this.jumpTimer.cancel();
                    Hero.this.jumpTimer = null;
                }
            }
        }, 0, 16);
    }

    /* 射击 */
    public Bullet shoot() {
        return new Bullet(this.x + this.width, this.y);
    }

    /* 连发 */
    public Bullet[] continuousShoot() {
        int xStep = 60;
        this.fireUpCount -= this.fireLevel;
        Bullet[] bullets = new Bullet[this.fireLevel];
        
        for (int i = 0; i < this.fireLevel; i++) {
            bullets[i] = new Bullet(this.x + this.width + xStep * i, this.y);
        }
        return bullets;
    }

    /* 发射导弹 */
    public Missile fireMissile() {
        --this.missile;
        return new Missile(this.x + this.width, this.y);
    }

    /* 增加生命 */
    public void addLife() {
        ++this.life;
    }

    /* 飞行提速 */
    public void increaseSpeedAndFly() {
        Start.speed = 10;
        this.y = 100;
        this.image = Start.heroFlyImg;
        this.isFlying = true;

        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                Start.speed = 5;
                Hero.this.y = 400;
                Hero.this.image = Hero.this.images[0];
                Hero.this.ableToFly = false;
                Hero.this.isFlying = false;
            }
        }, 10000);
    }

    /* 火力升级 */
    public void fireUpCount() {
        this.fireLevel++;
        this.fireUpCount += 20;
    }

    /* 导弹装备 */
    public void equipMissile() {
        this.missile += 5;
    }

    /* 获得护盾 */
    public void getShield() {
        this.shield = 3;
    }

    /* 获得经验值并升级 */
    public void getExp(int exp) {
        this.exp += exp;
        if (this.exp >= expRequire) {
            this.expRequire += 10;
            this.level++;
        }
    }
}