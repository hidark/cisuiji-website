// 游戏配置常量
const GameConfig = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 450
    },
    PADDLE: {
        WIDTH: 12,
        HEIGHT: 100,
        SPEED: 8,
        PLAYER_X: 30,
        AI_X_OFFSET: 42,
        SMOOTHING: 0.2,
        AI_REACTION_SPEED: 0.08,
        AI_ERROR_MARGIN: 20
    },
    BALL: {
        RADIUS: 8,
        INITIAL_SPEED: 5,
        MAX_SPEED: 15,
        SPEED_INCREASE: 1.05,
        TRAIL_LENGTH: 10
    },
    GAME: {
        MAX_SCORE: 11,
        FPS: 60
    },
    AUDIO: {
        HIT_FREQUENCY: 400,
        HIT_TYPE: 'square',
        HIT_VOLUME: 0.1,
        HIT_DURATION: 0.05
    }
};

// 音效管理器 - 解决内存泄漏问题
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (!this.initialized) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.initialized = true;
            } catch (e) {
                console.warn('Web Audio API not supported:', e);
                this.enabled = false;
            }
        }
    }

    playHit() {
        if (!this.enabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = GameConfig.AUDIO.HIT_FREQUENCY;
            oscillator.type = GameConfig.AUDIO.HIT_TYPE;
            gainNode.gain.value = GameConfig.AUDIO.HIT_VOLUME;
            
            const currentTime = this.audioContext.currentTime;
            oscillator.start(currentTime);
            oscillator.stop(currentTime + GameConfig.AUDIO.HIT_DURATION);
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    cleanup() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// 创建全局音效管理器实例
const audioManager = new AudioManager();

class Paddle {
    constructor(x, y, width, height, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = GameConfig.PADDLE.SPEED;
        this.isPlayer = isPlayer;
        this.targetY = y;
    }

    update(canvas, mouseY, ball, keyboardY = null, difficulty = null) {
        if (this.isPlayer) {
            // 优先使用键盘控制，其次是鼠标
            if (keyboardY !== null) {
                this.targetY = keyboardY;
            } else if (mouseY !== null) {
                this.targetY = mouseY - this.height / 2;
            }
            const smoothing = GameConfig.PADDLE.SMOOTHING;
            this.y += (this.targetY - this.y) * smoothing;
        } else {
            // 根据难度调整AI反应速度和误差
            const aiSettings = difficulty || { aiSpeed: GameConfig.PADDLE.AI_REACTION_SPEED, aiError: GameConfig.PADDLE.AI_ERROR_MARGIN };
            const aiReactionSpeed = aiSettings.aiSpeed;
            const predictedBallY = ball.y + (ball.dy * 5);
            this.targetY = predictedBallY - this.height / 2;
            
            const errorMargin = Math.random() * aiSettings.aiError - aiSettings.aiError / 2;
            this.targetY += errorMargin;
            
            this.y += (this.targetY - this.y) * aiReactionSpeed;
        }

        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
    }

    draw(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.radius = GameConfig.BALL.RADIUS;
        this.reset();
        this.maxSpeed = GameConfig.BALL.MAX_SPEED;
        this.trail = [];
        this.trailIndex = 0;
    }

    reset() {
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;
        this.dx = (Math.random() > 0.5 ? 1 : -1) * GameConfig.BALL.INITIAL_SPEED;
        this.dy = (Math.random() * 2 - 1) * 3;
        this.speed = GameConfig.BALL.INITIAL_SPEED;
        this.trail = [];
        this.trailIndex = 0;
    }

    update() {
        // 使用环形缓冲区优化性能
        if (this.trail.length < GameConfig.BALL.TRAIL_LENGTH) {
            this.trail.push({ x: this.x, y: this.y });
        } else {
            this.trail[this.trailIndex] = { x: this.x, y: this.y };
            this.trailIndex = (this.trailIndex + 1) % GameConfig.BALL.TRAIL_LENGTH;
        }

        this.x += this.dx;
        this.y += this.dy;

        if (this.y - this.radius <= 0 || this.y + this.radius >= this.canvas.height) {
            this.dy = -this.dy;
            this.y = this.y - this.radius <= 0 ? this.radius : this.canvas.height - this.radius;
        }
    }

    checkPaddleCollision(paddle) {
        if (this.x - this.radius <= paddle.x + paddle.width &&
            this.x + this.radius >= paddle.x &&
            this.y - this.radius <= paddle.y + paddle.height &&
            this.y + this.radius >= paddle.y) {
            
            const relativeIntersectY = (paddle.y + paddle.height / 2) - this.y;
            const normalizedIntersectY = relativeIntersectY / (paddle.height / 2);
            const bounceAngle = normalizedIntersectY * Math.PI / 4;
            
            this.speed = Math.min(this.speed * GameConfig.BALL.SPEED_INCREASE, this.maxSpeed);
            
            if (paddle.isPlayer) {
                this.dx = Math.abs(this.speed * Math.cos(bounceAngle));
            } else {
                this.dx = -Math.abs(this.speed * Math.cos(bounceAngle));
            }
            
            this.dy = this.speed * -Math.sin(bounceAngle);
            
            if (paddle.isPlayer) {
                this.x = paddle.x + paddle.width + this.radius;
            } else {
                this.x = paddle.x - this.radius;
            }
            
            return true;
        }
        return false;
    }

    draw(ctx) {
        // 绘制轨迹
        const trailLength = Math.min(this.trail.length, GameConfig.BALL.TRAIL_LENGTH);
        for (let i = 0; i < trailLength; i++) {
            const index = (this.trailIndex - trailLength + i + GameConfig.BALL.TRAIL_LENGTH) % GameConfig.BALL.TRAIL_LENGTH;
            const point = this.trail[index];
            if (point) {
                ctx.globalAlpha = (i + 1) / trailLength * 0.5;
                ctx.fillStyle = '#00ccff';
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.radius * ((i + 1) / trailLength), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 错误处理
        if (!this.ctx) {
            console.error('Unable to get canvas context');
            this.showError('浏览器不支持Canvas');
            return;
        }
        
        this.setupCanvas();
        
        // 使用配置常量
        const paddleY = this.canvas.height / 2 - GameConfig.PADDLE.HEIGHT / 2;
        this.playerPaddle = new Paddle(
            GameConfig.PADDLE.PLAYER_X, 
            paddleY, 
            GameConfig.PADDLE.WIDTH, 
            GameConfig.PADDLE.HEIGHT, 
            true
        );
        this.aiPaddle = new Paddle(
            this.canvas.width - GameConfig.PADDLE.AI_X_OFFSET, 
            paddleY, 
            GameConfig.PADDLE.WIDTH, 
            GameConfig.PADDLE.HEIGHT, 
            false
        );
        this.ball = new Ball(this.canvas);
        
        this.playerScore = 0;
        this.aiScore = 0;
        this.maxScore = GameConfig.GAME.MAX_SCORE;
        
        this.gameState = 'waiting';
        this.mouseY = this.canvas.height / 2;
        
        // 键盘控制状态
        this.keys = {
            w: false,
            s: false,
            ArrowUp: false,
            ArrowDown: false
        };
        this.keyboardY = null;
        
        // 触摸控制状态
        this.touchY = null;
        this.isTouchDevice = 'ontouchstart' in window;
        
        // 性能优化：缓存shadow设置
        this.shadowEnabled = true;
        
        // 难度设置
        this.difficulty = 'normal';
        this.difficultySettings = {
            easy: { aiSpeed: 0.04, aiError: 30, ballSpeedIncrease: 1.02 },
            normal: { aiSpeed: 0.08, aiError: 20, ballSpeedIncrease: 1.05 },
            hard: { aiSpeed: 0.12, aiError: 10, ballSpeedIncrease: 1.08 }
        };
        
        this.setupEventListeners();
        this.updateScore();
        
        // 初始化音效管理器
        audioManager.init();
        
        this.lastTime = 0;
        this.animationId = null;
        this.animate = this.animate.bind(this);
        this.animationId = requestAnimationFrame(this.animate);
    }

    setupCanvas() {
        // 响应式Canvas设置
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(GameConfig.CANVAS.WIDTH, window.innerWidth - 40);
        const aspectRatio = GameConfig.CANVAS.HEIGHT / GameConfig.CANVAS.WIDTH;
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
        
        // 移动端适配
        if (window.innerWidth < 768) {
            this.canvas.style.width = '100%';
            this.canvas.style.height = 'auto';
        }
    }

    setupEventListeners() {
        // 鼠标控制
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.canvas.height / rect.height;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key in this.keys) {
                e.preventDefault();
                this.keys[e.key] = true;
                this.updateKeyboardPosition();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key in this.keys) {
                e.preventDefault();
                this.keys[e.key] = false;
                this.updateKeyboardPosition();
            }
        });

        // 触摸控制
        if (this.isTouchDevice) {
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleTouch(e.touches[0]);
            });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                this.handleTouch(e.touches[0]);
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (e.touches.length === 0) {
                    this.touchY = null;
                }
            });
        }

        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
        
        // 设置面板
        const settingsBtn = document.createElement('button');
        settingsBtn.textContent = '设置';
        settingsBtn.className = 'btn';
        settingsBtn.id = 'settingsBtn';
        document.querySelector('.controls').appendChild(settingsBtn);
        
        settingsBtn.addEventListener('click', () => {
            const panel = document.getElementById('settingsPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        
        // 音效设置
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                audioManager.enabled = e.target.checked;
            });
        }
        
        // 难度设置
        const difficultySelect = document.getElementById('difficultySelect');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', (e) => {
                this.setDifficulty(e.target.value);
            });
        }

        // 窗口大小调整
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }

    updateKeyboardPosition() {
        const moveSpeed = GameConfig.PADDLE.SPEED * 2;
        if (this.keys.w || this.keys.ArrowUp) {
            this.keyboardY = Math.max(0, (this.keyboardY || this.playerPaddle.y) - moveSpeed);
        } else if (this.keys.s || this.keys.ArrowDown) {
            this.keyboardY = Math.min(
                this.canvas.height - this.playerPaddle.height,
                (this.keyboardY || this.playerPaddle.y) + moveSpeed
            );
        } else {
            this.keyboardY = null;
        }
    }

    handleTouch(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleY = this.canvas.height / rect.height;
        this.touchY = (touch.clientY - rect.top) * scaleY - this.playerPaddle.height / 2;
    }

    start() {
        if (this.gameState === 'waiting' || this.gameState === 'ended') {
            this.gameState = 'playing';
            this.ball.reset();
            document.getElementById('startBtn').disabled = true;
            document.getElementById('pauseBtn').disabled = false;
            this.updateStatus('游戏进行中');
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = '继续';
            this.updateStatus('游戏暂停');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = '暂停';
            this.updateStatus('游戏进行中');
        }
    }

    reset() {
        this.gameState = 'waiting';
        this.playerScore = 0;
        this.aiScore = 0;
        this.ball.reset();
        this.updateScore();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = '暂停';
        this.updateStatus('点击开始游戏');
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;

        // 优先级：键盘 > 触摸 > 鼠标
        const controlY = this.keyboardY !== null ? this.keyboardY : 
                        (this.touchY !== null ? this.touchY : this.mouseY);
        
        // 设置球速增长率
        this.playerPaddle.speedIncrease = this.difficultySettings[this.difficulty].ballSpeedIncrease;
        this.aiPaddle.speedIncrease = this.difficultySettings[this.difficulty].ballSpeedIncrease;
        
        this.playerPaddle.update(this.canvas, controlY, this.ball, this.keyboardY);
        this.aiPaddle.update(this.canvas, null, this.ball, null, this.difficultySettings[this.difficulty]);
        this.ball.update();

        if (this.ball.checkPaddleCollision(this.playerPaddle) || 
            this.ball.checkPaddleCollision(this.aiPaddle)) {
            audioManager.playHit();
        }

        if (this.ball.x < 0) {
            this.aiScore++;
            this.updateScore();
            this.checkGameEnd();
            if (this.gameState === 'playing') {
                this.ball.reset();
            }
        } else if (this.ball.x > this.canvas.width) {
            this.playerScore++;
            this.updateScore();
            this.checkGameEnd();
            if (this.gameState === 'playing') {
                this.ball.reset();
            }
        }
    }

    checkGameEnd() {
        if (this.playerScore >= this.maxScore || this.aiScore >= this.maxScore) {
            this.gameState = 'ended';
            const winner = this.playerScore >= this.maxScore ? '玩家' : 'AI';
            this.updateStatus(`${winner} 获胜！`);
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
        }
    }

    updateScore() {
        document.querySelector('.player-score').textContent = this.playerScore;
        document.querySelector('.ai-score').textContent = this.aiScore;
    }

    updateStatus(message) {
        document.querySelector('.status-message').textContent = message;
    }

    showError(message) {
        const statusElement = document.querySelector('.status-message');
        if (statusElement) {
            statusElement.textContent = `错误: ${message}`;
            statusElement.style.color = '#ff4444';
        }
    }
    
    setDifficulty(difficulty) {
        if (this.difficultySettings[difficulty]) {
            this.difficulty = difficulty;
            // 更新球速增长率
            GameConfig.BALL.SPEED_INCREASE = this.difficultySettings[difficulty].ballSpeedIncrease;
            this.updateStatus(`难度: ${difficulty === 'easy' ? '简单' : difficulty === 'normal' ? '普通' : '困难'}`);
        }
    }

    drawCenterLine() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    draw() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawCenterLine();
        
        // 性能优化：减少shadow重绘
        if (this.shadowEnabled) {
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00ccff';
        }
        
        this.playerPaddle.draw(this.ctx);
        this.aiPaddle.draw(this.ctx);
        this.ball.draw(this.ctx);
        
        if (this.shadowEnabled) {
            this.ctx.restore();
        }
    }

    cleanup() {
        // 清理资源
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        audioManager.cleanup();
        
        // 移除事件监听器
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('resize', this.handleResize);
    }

    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(this.animate);
    }
}

// 游戏实例管理
// 现在游戏实例由index.html中的模式选择逻辑管理