/**
 * 障碍物类
 * 优化版本：简化代码结构
 */
public class Obstacle extends MovableObject {

    public Obstacle(int x) {
        this.image = Start.obstacleImg;
        this.x = x;
        this.y = 400;
        this.width = this.image.getWidth();
        this.height = this.image.getHeight();
        this.life = 0;
    }

    @Override
    public void move() {
        this.x -= Start.speed;
    }
}