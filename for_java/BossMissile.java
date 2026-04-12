/**
 * Boss 导弹类
 * 优化版本：简化代码结构
 */
public class BossMissile extends Missile {
    
    public BossMissile(int x, int y) {
        super(x, y);
        this.image = Start.missileOfBossImg;
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.speed = 7;
        this.damage = 2;
    }

    /* 敌方导弹反向移动 */
    @Override
    public void move() {
        this.x -= this.speed;
    }
}