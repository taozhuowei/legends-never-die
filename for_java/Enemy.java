import java.awt.image.BufferedImage;

/**
 * 敌人类
 * 优化版本：简化代码，移除冗余
 */
public class Enemy extends MovableObject implements NPC {
    private int index;

    public Enemy(int x) {
        this.images = new BufferedImage[]{
            Start.enemyImg1,
            Start.enemyImg2,
            Start.enemyImg3,
            Start.enemyImg4,
            Start.enemyImg5
        };
        this.index = 0;
        this.image = this.images[0];
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.x = x;
        this.y = 400;
        this.life = 1;
        this.exp = 5;
    }

    /* 移动动画 */
    @Override
    public void move() {
        int num = this.index++ / 10 % this.images.length;
        this.image = this.images[num];
        this.x -= Start.speed;
    }

    @Override
    public int getExp() {
        return this.exp;
    }
}