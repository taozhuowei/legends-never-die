/**
 * 导弹类
 * 优化版本：简化代码结构
 */
public class Missile extends Bullet {

    public Missile(int x, int y) {
        super(x, y);
        this.image = Start.missileOfHeroImg;
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.damage = 2;
    }

    @Override
    public void move() {
        this.x += this.speed;
    }
}