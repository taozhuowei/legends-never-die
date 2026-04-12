/**
 * 渲染器模块
 * 处理Canvas缩放和高DPI适配
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        
        // 逻辑分辨率（游戏坐标系）
        this.logicalWidth = CONFIG.BASE_WIDTH;
        this.logicalHeight = CONFIG.BASE_HEIGHT;
        
        this._setupCanvas();
        this._bindResize();
    }
    
    _setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        
        // 设置实际像素尺寸（考虑DPI）
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        
        // 缩放上下文以匹配DPI
        this.ctx.scale(this.dpr, this.dpr);
        
        // 设置CSS尺寸
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }
    
    _bindResize() {
        window.addEventListener('resize', () => {
            this._setupCanvas();
        });
    }
    
    // 获取缩放比例
    getScale() {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: rect.width / this.logicalWidth,
            y: rect.height / this.logicalHeight
        };
    }
    
    // 清除画布
    clear() {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);
    }
    
    // 保存上下文状态
    save() {
        this.ctx.save();
    }
    
    // 恢复上下文状态
    restore() {
        this.ctx.restore();
    }
    
    // 设置全局透明度
    setGlobalAlpha(alpha) {
        this.ctx.globalAlpha = alpha;
    }
    
    // 绘制图片（自动缩放坐标）
    drawImage(image, x, y, width, height) {
        const scale = this.getScale();
        const drawX = x * scale.x;
        const drawY = y * scale.y;
        const drawW = width ? width * scale.x : image.width * scale.x;
        const drawH = height ? height * scale.y : image.height * scale.y;
        
        this.ctx.drawImage(image, drawX, drawY, drawW, drawH);
    }
    
    // 填充矩形
    fillRect(x, y, width, height, color) {
        const scale = this.getScale();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * scale.x, y * scale.y, width * scale.x, height * scale.y);
    }
    
    // 绘制文字
    drawText(text, x, y, options = {}) {
        const scale = this.getScale();
        const fontSize = (options.fontSize || 20) * Math.min(scale.x, scale.y);
        
        this.ctx.font = `${options.fontWeight || 'bold'} ${fontSize}px ${options.fontFamily || 'Microsoft YaHei'}`;
        this.ctx.fillStyle = options.color || '#fff';
        this.ctx.textAlign = options.textAlign || 'left';
        this.ctx.textBaseline = options.textBaseline || 'top';
        
        if (options.shadow) {
            this.ctx.shadowColor = options.shadowColor || '#000';
            this.ctx.shadowBlur = options.shadowBlur || 4;
        }
        
        this.ctx.fillText(text, x * scale.x, y * scale.y);
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }
    
    // 获取Canvas矩形
    getBoundingClientRect() {
        return this.canvas.getBoundingClientRect();
    }
}

// 性能监控
class PerformanceMonitor {
    constructor() {
        this.frames = [];
        this.lastTime = performance.now();
        this.fps = 60;
    }
    
    update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        
        this.frames.push(delta);
        if (this.frames.length > 60) {
            this.frames.shift();
        }
        
        // 计算平均FPS
        const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        this.fps = Math.round(1000 / avgDelta);
    }
    
    getFPS() {
        return this.fps;
    }
}
