import java.awt.image.BufferedImage;

/**
 * 抽象类：可移动的对象
 * 所有游戏对象的基类
 */
public abstract class MovableObject {
    protected int x;
    protected int y;
    protected int width;
    protected int height;
    protected BufferedImage image;
    protected BufferedImage[] images = new BufferedImage[0];
    protected int exp;
    protected int life;

    public MovableObject() {}

    /* 抽象方法：移动 */
    public abstract void move();

    /* 获取经验值 */
    public int getExp() {
        return this.exp;
    }
}