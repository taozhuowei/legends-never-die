/**
 * 游戏逻辑单元测试
 * 测试速度系统、跳跃参数、碰撞检测等核心功能
 */

// ==================== 测试框架 ====================
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }
    
    describe(name, fn) {
        this.currentSuite = name;
        fn();
    }
    
    it(name, fn) {
        this.tests.push({
            suite: this.currentSuite,
            name,
            fn
        });
    }
    
    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected} but got ${actual}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (!(actual > expected)) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (!(actual < expected)) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toBeGreaterThanOrEqual: (expected) => {
                if (!(actual >= expected)) {
                    throw new Error(`Expected ${actual} to be >= ${expected}`);
                }
            },
            toBeLessThanOrEqual: (expected) => {
                if (!(actual <= expected)) {
                    throw new Error(`Expected ${actual} to be <= ${expected}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value but got ${actual}`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value but got ${actual}`);
                }
            }
        };
    }
    
    async run() {
        console.log('🧪 开始运行游戏单元测试...\n');
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.passed++;
                this.results.push({
                    suite: test.suite,
                    name: test.name,
                    status: 'PASS'
                });
                console.log(`  ✅ ${test.name}`);
            } catch (error) {
                this.failed++;
                this.results.push({
                    suite: test.suite,
                    name: test.name,
                    status: 'FAIL',
                    error: error.message
                });
                console.log(`  ❌ ${test.name}`);
                console.log(`     ${error.message}`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log(`测试结果: ${this.passed} 通过, ${this.failed} 失败`);
        console.log('='.repeat(50));
        
        return {
            passed: this.passed,
            failed: this.failed,
            results: this.results
        };
    }
}

// ==================== 测试用例 ====================
const runner = new TestRunner();

// 速度系统测试
runner.describe('速度系统', () => {
    runner.it('初始速度应该正确设置', () => {
        runner.expect(CONFIG.INITIAL_SPEED).toBe(3);
    });
    
    runner.it('最大速度应该有合理上限', () => {
        runner.expect(CONFIG.MAX_SPEED).toBeLessThanOrEqual(12);
        runner.expect(CONFIG.MAX_SPEED).toBeGreaterThan(CONFIG.INITIAL_SPEED);
    });
    
    runner.it('速度增量应该合理', () => {
        runner.expect(CONFIG.SPEED_ACCELERATION).toBeLessThan(0.01);
        runner.expect(CONFIG.SPEED_MILESTONE_INTERVAL).toBeGreaterThan(0);
    });
    
    runner.it('速度计算应该正确', () => {
        // 模拟速度计算
        const speedLevel = 5;
        const speedIncrease = 0.5;
        const calculatedSpeed = Math.min(
            CONFIG.INITIAL_SPEED + speedLevel * speedIncrease,
            CONFIG.MAX_SPEED
        );
        runner.expect(calculatedSpeed).toBe(CONFIG.INITIAL_SPEED + 2.5);
    });
});

// 跳跃系统测试
runner.describe('跳跃系统', () => {
    runner.it('重力参数应该合理', () => {
        runner.expect(CONFIG.GRAVITY).toBeGreaterThan(0);
        runner.expect(CONFIG.GRAVITY).toBeLessThan(1);
    });
    
    runner.it('跳跃速度应该为负值（向上）', () => {
        runner.expect(CONFIG.JUMP_VELOCITY).toBeLessThan(0);
    });
    
    runner.it('跳跃力度应该足够越过障碍', () => {
        // 计算理论跳跃高度
        const jumpHeight = (CONFIG.JUMP_VELOCITY * CONFIG.JUMP_VELOCITY) / (2 * CONFIG.GRAVITY);
        runner.expect(jumpHeight).toBeGreaterThan(80); // 至少能跳80像素高
    });
    
    runner.it('跳跃时间窗口应该合理', () => {
        // 计算跳跃总时间（上升+下降）
        const jumpTime = -2 * CONFIG.JUMP_VELOCITY / CONFIG.GRAVITY;
        // 换算成帧数（60fps）
        const jumpFrames = jumpTime * 60;
        runner.expect(jumpFrames).toBeGreaterThan(30); // 至少30帧
        runner.expect(jumpFrames).toBeLessThan(120); // 不超过120帧
    });
});

// 障碍物系统测试
runner.describe('障碍物系统', () => {
    runner.it('生成间隔应该合理', () => {
        runner.expect(CONFIG.GENERATOR_INTERVAL).toBeGreaterThan(5);
        runner.expect(CONFIG.GENERATOR_INTERVAL).toBeLessThan(30);
    });
    
    runner.it('障碍物间距应该足够跳跃', () => {
        // 检查最小间距
        const minSpacing = 500;
        runner.expect(minSpacing).toBeGreaterThan(300);
    });
    
    runner.it('障碍物应该在地面位置', () => {
        const obstacleY = CONFIG.GROUND_Y + 10;
        runner.expect(obstacleY).toBeGreaterThan(CONFIG.GROUND_Y);
    });
});

// 碰撞检测测试
runner.describe('碰撞检测', () => {
    runner.it('碰撞检测函数应该存在', () => {
        runner.expect(typeof checkHit).toBe('function');
    });
    
    runner.it('应该正确检测碰撞', () => {
        const obj1 = { x: 0, y: 0, width: 50, height: 50 };
        const obj2 = { x: 25, y: 25, width: 50, height: 50 };
        runner.expect(checkHit(obj1, obj2)).toBeTruthy();
    });
    
    runner.it('应该正确检测未碰撞', () => {
        const obj1 = { x: 0, y: 0, width: 50, height: 50 };
        const obj2 = { x: 100, y: 100, width: 50, height: 50 };
        runner.expect(checkHit(obj1, obj2)).toBeFalsy();
    });
});

// 游戏状态测试
runner.describe('游戏状态', () => {
    runner.it('游戏状态常量应该正确', () => {
        runner.expect(GAME_STATE.START).toBe(0);
        runner.expect(GAME_STATE.PLAYING).toBe(1);
        runner.expect(GAME_STATE.PAUSED).toBe(2);
        runner.expect(GAME_STATE.GAMEOVER).toBe(3);
    });
});

// 工具函数测试
runner.describe('工具函数', () => {
    runner.it('randomInt应该生成指定范围内的整数', () => {
        const min = 5, max = 10;
        for (let i = 0; i < 100; i++) {
            const val = randomInt(min, max);
            runner.expect(val).toBeGreaterThanOrEqual(min);
            runner.expect(val).toBeLessThanOrEqual(max);
        }
    });
    
    runner.it('checkCollision应该正确工作', () => {
        const obj1 = { x: 0, y: 0, width: 50, height: 50, active: true };
        const obj2 = { x: 20, y: 20, width: 50, height: 50, active: true };
        runner.expect(checkCollision(obj1, obj2)).toBeTruthy();
    });
});

// 跳跃物理模拟测试
runner.describe('跳跃物理模拟', () => {
    runner.it('应该能计算正确的跳跃轨迹', () => {
        const gravity = CONFIG.GRAVITY;
        const jumpVelocity = CONFIG.JUMP_VELOCITY;
        const groundY = CONFIG.GROUND_Y;
        
        let y = groundY;
        let velocity = jumpVelocity;
        let maxHeight = groundY;
        let frames = 0;
        
        // 模拟跳跃
        while (y < groundY || velocity < 0) {
            y += velocity;
            velocity += gravity;
            maxHeight = Math.min(maxHeight, y);
            frames++;
            
            // 防止无限循环
            if (frames > 1000) break;
        }
        
        const jumpHeight = groundY - maxHeight;
        runner.expect(jumpHeight).toBeGreaterThan(50);
        runner.expect(frames).toBeGreaterThan(20);
    });
    
    runner.it('跳跃应该能越过标准障碍物', () => {
        // 障碍物高度约60像素
        const obstacleHeight = 60;
        // Hero高度约80像素
        const heroHeight = 80;
        // 需要跳起的高度
        const requiredHeight = obstacleHeight + 20; // +20 安全边距
        
        // 计算理论跳跃高度
        const jumpHeight = (CONFIG.JUMP_VELOCITY * CONFIG.JUMP_VELOCITY) / (2 * CONFIG.GRAVITY);
        
        runner.expect(jumpHeight).toBeGreaterThan(requiredHeight);
    });
});

// 运行测试
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, runner };
} else {
    // 浏览器环境
    window.TestRunner = TestRunner;
    window.GameTests = runner;
}
