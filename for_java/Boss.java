/**
 * Boss 类
 * 优化版本：简化代码结构
 */
public class Boss extends Enemy implements NPC {

    public Boss(int x) {
        super(x);
        this.image = Start.bossImg;
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.y = 400;
        this.life = 2;
        this.exp = 10;
    }

    @Override
    public void move() {
        this.x -= Start.speed;
    }

    /* 发射导弹 */
    public BossMissile fireMissile() {
        return new BossMissile(this.x, this.y);
    }

    @Override
    public int getExp() {
        return this.exp;
    }
}