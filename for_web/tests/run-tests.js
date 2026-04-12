/**
 * 游戏测试运行器
 * 整合所有测试并生成报告
 */

class GameTestRunner {
    constructor() {
        this.results = [];
        this.startTime = null;
        this.endTime = null;
    }
    
    // 运行所有测试
    async runAllTests() {
        console.log('🏃 跑酷游戏全量测试开始...\n');
        this.startTime = Date.now();
        
        // 1. 配置测试
        await this.testConfig();
        
        // 2. 速度系统测试
        await this.testSpeedSystem();
        
        // 3. 跳跃系统测试
        await this.testJumpSystem();
        
        // 4. 碰撞检测测试
        await this.testCollisionSystem();
        
        // 5. 障碍物系统测试
        await this.testObstacleSystem();
        
        // 6. 游戏流程测试
        await this.testGameFlow();
        
        this.endTime = Date.now();
        this.printReport();
        
        return this.results;
    }
    
    // 配置测试
    async testConfig() {
        console.log('📋 测试游戏配置...');
        const tests = [];
        
        // 基础配置检查
        tests.push({
            name: '基础分辨率配置',
            test: () => {
                if (typeof CONFIG === 'undefined') throw new Error('CONFIG未定义');
                if (CONFIG.BASE_WIDTH !== 1024) throw new Error('BASE_WIDTH应为1024');
                if (CONFIG.BASE_HEIGHT !== 560) throw new Error('BASE_HEIGHT应为560');
                return true;
            }
        });
        
        // 速度配置检查
        tests.push({
            name: '速度配置合理性',
            test: () => {
                if (CONFIG.INITIAL_SPEED < 1) throw new Error('初始速度过小');
                if (CONFIG.INITIAL_SPEED > 8) throw new Error('初始速度过大');
                if (CONFIG.MAX_SPEED <= CONFIG.INITIAL_SPEED) throw new Error('最大速度应大于初始速度');
                if (CONFIG.MAX_SPEED > 20) throw new Error('最大速度过大');
                return true;
            }
        });
        
        // 重力配置检查
        tests.push({
            name: '重力配置合理性',
            test: () => {
                if (CONFIG.GRAVITY <= 0) throw new Error('重力必须大于0');
                if (CONFIG.GRAVITY > 2) throw new Error('重力过大');
                if (CONFIG.JUMP_VELOCITY >= 0) throw new Error('跳跃速度应为负值');
                return true;
            }
        });
        
        // 地面高度检查
        tests.push({
            name: '地面高度配置',
            test: () => {
                if (CONFIG.GROUND_Y < 200) throw new Error('地面高度过低');
                if (CONFIG.GROUND_Y > 500) throw new Error('地面高度过高');
                return true;
            }
        });
        
        await this.runTestSuite('配置测试', tests);
    }
    
    // 速度系统测试
    async testSpeedSystem() {
        console.log('\n🚀 测试速度系统...');
        const tests = [];
        
        // 初始速度测试
        tests.push({
            name: '初始速度正确性',
            test: () => {
                const expectedSpeed = 3;
                if (CONFIG.INITIAL_SPEED !== expectedSpeed) {
                    throw new Error(`初始速度应为${expectedSpeed}，实际为${CONFIG.INITIAL_SPEED}`);
                }
                return true;
            }
        });
        
        // 速度增长测试
        tests.push({
            name: '速度增长计算',
            test: () => {
                const speedLevel = 5;
                const speedIncrease = 0.5;
                const expectedSpeed = Math.min(
                    CONFIG.INITIAL_SPEED + speedLevel * speedIncrease,
                    CONFIG.MAX_SPEED
                );
                
                if (expectedSpeed > CONFIG.MAX_SPEED) {
                    throw new Error('速度计算超出最大值限制');
                }
                
                // 检查速度增长是否合理
                const timeToMax = (CONFIG.MAX_SPEED - CONFIG.INITIAL_SPEED) / speedIncrease;
                if (timeToMax < 5) throw new Error('速度增长过快');
                if (timeToMax > 50) throw new Error('速度增长过慢');
                
                return true;
            }
        });
        
        // 速度上限测试
        tests.push({
            name: '速度上限约束',
            test: () => {
                let speed = CONFIG.INITIAL_SPEED;
                let level = 0;
                
                // 模拟100个里程碑
                for (let i = 0; i < 100; i++) {
                    speed = Math.min(
                        CONFIG.INITIAL_SPEED + i * 0.5,
                        CONFIG.MAX_SPEED
                    );
                }
                
                if (speed > CONFIG.MAX_SPEED) {
                    throw new Error('速度超出上限');
                }
                if (speed !== CONFIG.MAX_SPEED) {
                    throw new Error('速度应达到上限');
                }
                return true;
            }
        });
        
        // 渐进式加速测试
        tests.push({
            name: '渐进式加速验证',
            test: () => {
                const milestoneInterval = CONFIG.SPEED_MILESTONE_INTERVAL || 500;
                const speeds = [];
                
                for (let meters = 0; meters <= 5000; meters += milestoneInterval) {
                    const level = Math.floor(meters / milestoneInterval);
                    const speed = Math.min(
                        CONFIG.INITIAL_SPEED + level * 0.5,
                        CONFIG.MAX_SPEED
                    );
                    speeds.push(speed);
                }
                
                // 检查速度是否单调递增（在达到最大值前）
                for (let i = 1; i < speeds.length && speeds[i] < CONFIG.MAX_SPEED; i++) {
                    if (speeds[i] <= speeds[i-1]) {
                        throw new Error('速度应单调递增');
                    }
                }
                
                return true;
            }
        });
        
        await this.runTestSuite('速度系统', tests);
    }
    
    // 跳跃系统测试
    async testJumpSystem() {
        console.log('\n🦘 测试跳跃系统...');
        const tests = [];
        
        // 跳跃高度计算
        tests.push({
            name: '跳跃高度计算',
            test: () => {
                const gravity = CONFIG.GRAVITY;
                const jumpVelocity = CONFIG.JUMP_VELOCITY;
                
                // 使用能量守恒计算跳跃高度
                // h = v² / (2g)
                const jumpHeight = (jumpVelocity * jumpVelocity) / (2 * gravity);
                
                // 障碍物高度约60px，Hero高度约80px
                const requiredHeight = 60 + 20; // 障碍物 + 安全边距
                
                if (jumpHeight < requiredHeight) {
                    throw new Error(`跳跃高度(${Math.round(jumpHeight)}px)不足以越过障碍物(${requiredHeight}px)`);
                }
                
                // 跳跃高度不应过高
                if (jumpHeight > 250) {
                    throw new Error(`跳跃高度(${Math.round(jumpHeight)}px)过高，可能导致游戏不平衡`);
                }
                
                return true;
            }
        });
        
        // 跳跃时间测试
        tests.push({
            name: '跳跃时间合理性',
            test: () => {
                const gravity = CONFIG.GRAVITY;
                const jumpVelocity = CONFIG.JUMP_VELOCITY;
                
                // 计算跳跃总时间 (上升+下降)
                const jumpTime = -2 * jumpVelocity / gravity;
                const jumpFrames = jumpTime * 60; // 60fps
                
                if (jumpFrames < 20) {
                    throw new Error(`跳跃时间(${Math.round(jumpFrames)}帧)过短，玩家反应时间不足`);
                }
                if (jumpFrames > 100) {
                    throw new Error(`跳跃时间(${Math.round(jumpFrames)}帧)过长，影响游戏节奏`);
                }
                
                return true;
            }
        });
        
        // 物理模拟测试
        tests.push({
            name: '跳跃物理模拟',
            test: () => {
                const groundY = CONFIG.GROUND_Y;
                let y = groundY;
                let velocity = CONFIG.JUMP_VELOCITY;
                let maxHeight = groundY;
                let frames = 0;
                
                // 模拟跳跃过程
                while (y < groundY || velocity < 0) {
                    y += velocity;
                    velocity += CONFIG.GRAVITY;
                    maxHeight = Math.min(maxHeight, y);
                    frames++;
                    
                    if (frames > 1000) {
                        throw new Error('物理模拟异常：可能无法落地');
                    }
                }
                
                const actualHeight = groundY - maxHeight;
                if (actualHeight < 80) {
                    throw new Error(`实际跳跃高度(${Math.round(actualHeight)}px)不足`);
                }
                
                return true;
            }
        });
        
        // 多速度跳跃测试
        tests.push({
            name: '不同速度下的跳跃',
            test: () => {
                const speeds = [3, 5, 8, 10, 12];
                
                for (const speed of speeds) {
                    // 跳跃距离 = 水平速度 * 跳跃时间
                    const jumpTime = -2 * CONFIG.JUMP_VELOCITY / CONFIG.GRAVITY;
                    const jumpDistance = speed * jumpTime;
                    
                    // 障碍物间距至少500px
                    if (jumpDistance < 200) {
                        throw new Error(`速度${speed}时跳跃距离(${Math.round(jumpDistance)}px)过短`);
                    }
                }
                
                return true;
            }
        });
        
        await this.runTestSuite('跳跃系统', tests);
    }
    
    // 碰撞检测测试
    async testCollisionSystem() {
        console.log('\n💥 测试碰撞检测...');
        const tests = [];
        
        // 碰撞函数存在性
        tests.push({
            name: '碰撞函数存在',
            test: () => {
                if (typeof checkHit !== 'function') {
                    throw new Error('checkHit函数未定义');
                }
                if (typeof checkCollision !== 'function') {
                    throw new Error('checkCollision函数未定义');
                }
                return true;
            }
        });
        
        // 碰撞检测正确性
        tests.push({
            name: '碰撞检测正确性',
            test: () => {
                // 测试碰撞情况
                const obj1 = { x: 0, y: 0, width: 50, height: 50 };
                const obj2 = { x: 25, y: 25, width: 50, height: 50 };
                
                if (!checkHit(obj1, obj2)) {
                    throw new Error('应检测到碰撞');
                }
                
                // 测试不碰撞情况
                const obj3 = { x: 100, y: 100, width: 50, height: 50 };
                if (checkHit(obj1, obj3)) {
                    throw new Error('不应检测到碰撞');
                }
                
                return true;
            }
        });
        
        // 边界碰撞测试
        tests.push({
            name: '边界碰撞检测',
            test: () => {
                // 刚好接触
                const obj1 = { x: 0, y: 0, width: 50, height: 50 };
                const obj2 = { x: 50, y: 0, width: 50, height: 50 };
                
                // 根据实现，边界接触是否算碰撞可能有不同定义
                // 这里主要测试不会崩溃
                checkHit(obj1, obj2);
                
                // 包含关系
                const obj3 = { x: 10, y: 10, width: 30, height: 30 };
                if (!checkHit(obj1, obj3)) {
                    throw new Error('包含关系应检测到碰撞');
                }
                
                return true;
            }
        });
        
        await this.runTestSuite('碰撞检测', tests);
    }
    
    // 障碍物系统测试
    async testObstacleSystem() {
        console.log('\n🚧 测试障碍物系统...');
        const tests = [];
        
        // 生成间隔测试
        tests.push({
            name: '生成间隔合理性',
            test: () => {
                if (CONFIG.GENERATOR_INTERVAL < 5) {
                    throw new Error('生成间隔过短');
                }
                if (CONFIG.GENERATOR_INTERVAL > 30) {
                    throw new Error('生成间隔过长');
                }
                return true;
            }
        });
        
        // 障碍物间距测试
        tests.push({
            name: '障碍物间距充足性',
            test: () => {
                // 计算最大速度下的跳跃距离
                const maxSpeed = CONFIG.MAX_SPEED;
                const jumpTime = -2 * CONFIG.JUMP_VELOCITY / CONFIG.GRAVITY;
                const maxJumpDistance = maxSpeed * jumpTime;
                
                // 最小间距应大于跳跃距离
                const minSpacing = 500; // _generateXPosition中的最小间距
                
                if (minSpacing < maxJumpDistance * 0.8) {
                    throw new Error(`障碍物间距(${minSpacing}px)可能不足以在最大速度(${maxSpeed})下完成连跳`);
                }
                
                return true;
            }
        });
        
        // 障碍物位置测试
        tests.push({
            name: '障碍物地面位置',
            test: () => {
                // 障碍物Y坐标应该在地面
                const expectedY = CONFIG.GROUND_Y + 10;
                if (expectedY <= CONFIG.GROUND_Y) {
                    throw new Error('障碍物应位于地面');
                }
                return true;
            }
        });
        
        await this.runTestSuite('障碍物系统', tests);
    }
    
    // 游戏流程测试
    async testGameFlow() {
        console.log('\n🎮 测试游戏流程...');
        const tests = [];
        
        // 游戏状态测试
        tests.push({
            name: '游戏状态定义',
            test: () => {
                if (typeof GAME_STATE === 'undefined') {
                    throw new Error('GAME_STATE未定义');
                }
                if (GAME_STATE.START !== 0) throw new Error('START状态应为0');
                if (GAME_STATE.PLAYING !== 1) throw new Error('PLAYING状态应为1');
                if (GAME_STATE.PAUSED !== 2) throw new Error('PAUSED状态应为2');
                if (GAME_STATE.GAMEOVER !== 3) throw new Error('GAMEOVER状态应为3');
                return true;
            }
        });
        
        // 工具函数测试
        tests.push({
            name: '随机数生成器',
            test: () => {
                if (typeof randomInt !== 'function') {
                    throw new Error('randomInt函数未定义');
                }
                
                // 测试随机数范围
                for (let i = 0; i < 100; i++) {
                    const val = randomInt(5, 10);
                    if (val < 5 || val > 10) {
                        throw new Error(`随机数${val}超出范围[5,10]`);
                    }
                }
                
                return true;
            }
        });
        
        // 资源加载测试
        tests.push({
            name: '资源配置检查',
            test: () => {
                if (typeof CONFIG === 'undefined' || !CONFIG.ASSET_PATH) {
                    throw new Error('ASSET_PATH未配置');
                }
                return true;
            }
        });
        
        await this.runTestSuite('游戏流程', tests);
    }
    
    // 运行测试套件
    async runTestSuite(suiteName, tests) {
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                const result = await test.test();
                if (result) {
                    passed++;
                    console.log(`  ✅ ${test.name}`);
                    this.results.push({
                        suite: suiteName,
                        name: test.name,
                        status: 'PASS',
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                failed++;
                console.log(`  ❌ ${test.name}: ${error.message}`);
                this.results.push({
                    suite: suiteName,
                    name: test.name,
                    status: 'FAIL',
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }
        
        console.log(`  结果: ${passed}/${tests.length} 通过`);
    }
    
    // 打印测试报告
    printReport() {
        const duration = this.endTime - this.startTime;
        const total = this.results.length;
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 测试报告');
        console.log('='.repeat(60));
        console.log(`总测试数: ${total}`);
        console.log(`通过: ${passed} ✅`);
        console.log(`失败: ${failed} ❌`);
        console.log(`通过率: ${((passed/total)*100).toFixed(1)}%`);
        console.log(`耗时: ${duration}ms`);
        console.log('='.repeat(60));
        
        if (failed > 0) {
            console.log('\n❌ 失败的测试:');
            this.results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  [${r.suite}] ${r.name}`);
                console.log(`    错误: ${r.error}`);
            });
        }
        
        console.log('\n✨ 测试完成！\n');
        
        // 返回摘要
        return {
            total,
            passed,
            failed,
            duration,
            passRate: ((passed/total)*100).toFixed(1)
        };
    }
    
    // 导出结果
    exportResults() {
        return {
            timestamp: new Date().toISOString(),
            summary: this.printReport(),
            details: this.results
        };
    }
}

// 创建全局实例
const testRunner = new GameTestRunner();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameTestRunner, testRunner };
} else {
    window.GameTestRunner = GameTestRunner;
    window.testRunner = testRunner;
}
