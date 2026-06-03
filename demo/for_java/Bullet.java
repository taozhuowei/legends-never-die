/**
 * 子弹类
 * 优化版本：简化代码结构
 */
public class Bullet extends MovableObject {
    protected int speed;
    public int damage;

    public Bullet(int x, int y) {
        this.image = Start.bulletImg;
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.x = x;
        this.y = y;
        this.speed = 5;
        this.damage = 1;
    }

    /* 子弹前进 */
    public void move() {
        this.x += this.speed;
    }
}