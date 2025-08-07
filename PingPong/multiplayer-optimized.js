// 优化后的多人游戏客户端代码
class MultiplayerGame {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerNumber = null;
        this.playerId = Math.random().toString(36).substr(2, 9);
        this.playerName = localStorage.getItem('playerName') || `Player_${this.playerId.substr(0, 4)}`;
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 启用硬件加速
        this.ctx.imageSmoothingEnabled = false;
        
        this.gameState = {
            ball: { x: 400, y: 225, dx: 0, dy: 0 },
            paddles: {
                player1: { y: 175, score: 0 },
                player2: { y: 175, score: 0 }
            },
            status: 'waiting'
        };
        
        this.localPaddleY = 175;
        this.lastSentPaddleY = 175; // 记录上次发送的位置
        this.mouseY = 225;
        this.keys = {
            w: false,
            s: false,
            ArrowUp: false,
            ArrowDown: false
        };
        
        this.isConnected = false;
        this.pingInterval = null;
        this.latency = 0;
        
        // 球轨迹优化
        this.ballTrail = [];
        this.maxTrailLength = 5; // 减少轨迹长度
        
        // 性能优化
        this.animationId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // 网络优化
        this.sendInterval = null;
        this.sendRate = 50; // 每秒发送20次（50ms间隔）
        this.positionThreshold = 2; // 位置变化阈值
        
        // 渲染优化
        this.needsRedraw = true;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        
        this.setupCanvas();
        this.setupOffscreenCanvas();
        this.setupEventListeners();
        this.animate = this.animate.bind(this);
    }
    
    setupCanvas() {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const aspectRatio = 450 / 800;
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
    }
    
    setupOffscreenCanvas() {
        // 创建离屏画布用于双缓冲
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.offscreenCtx.imageSmoothingEnabled = false;
    }
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3000`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to server');
                this.isConnected = true;
                this.updateConnectionStatus('已连接到服务器');
                
                // 开始ping监测
                this.startPingMonitoring();
                
                // 开始位置发送定时器
                this.startPositionSending();
                
                // 自动加入游戏
                this.joinGame();
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from server');
                this.isConnected = false;
                this.updateConnectionStatus('连接已断开');
                this.stopPingMonitoring();
                this.stopPositionSending();
                
                // 显示重连按钮
                document.getElementById('reconnectBtn').style.display = 'inline-block';
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('连接错误');
            };
            
        } catch (error) {
            console.error('Failed to connect:', error);
            this.updateConnectionStatus('无法连接到服务器');
        }
    }
    
    handleServerMessage(data) {
        switch (data.type) {
            case 'gameInit':
                this.roomId = data.roomId;
                this.playerNumber = data.playerNumber;
                this.gameState = data.gameState;
                this.updateStatus(`你是玩家 ${this.playerNumber}`);
                document.getElementById('roomInfo').textContent = `房间: ${this.roomId}`;
                this.needsRedraw = true;
                break;
                
            case 'playerJoined':
                this.updateStatus(`${data.player.name} 加入了游戏`);
                if (data.totalPlayers === 2) {
                    document.getElementById('startOnlineBtn').disabled = false;
                }
                break;
                
            case 'playerLeft':
                this.updateStatus(`${data.player.name} 离开了游戏`);
                document.getElementById('startOnlineBtn').disabled = true;
                this.gameState.status = 'waiting';
                this.needsRedraw = true;
                break;
                
            case 'canStart':
                this.updateStatus(data.message);
                document.getElementById('startOnlineBtn').disabled = false;
                break;
                
            case 'gameStarted':
                this.gameState = data.gameState;
                this.updateStatus('游戏开始！');
                document.getElementById('startOnlineBtn').disabled = true;
                this.needsRedraw = true;
                break;
                
            case 'gameUpdate':
                this.updateGameState(data.gameState);
                this.needsRedraw = true;
                break;
                
            case 'gameEnded':
                this.gameState.status = 'ended';
                const winnerText = data.winner === this.playerNumber ? '你赢了！' : '你输了！';
                this.updateStatus(`游戏结束 - ${winnerText}`);
                document.getElementById('startOnlineBtn').disabled = false;
                this.needsRedraw = true;
                break;
                
            case 'pong':
                this.latency = Date.now() - data.timestamp;
                document.getElementById('latency').textContent = `延迟: ${this.latency}ms`;
                break;
        }
    }
    
    updateGameState(serverState) {
        // 使用预测和插值
        const now = Date.now();
        const predictTime = this.latency / 2; // 预测半个延迟时间
        
        // 预测球的位置
        const predictedBallX = serverState.ball.x + (serverState.ball.dx * predictTime / 16);
        const predictedBallY = serverState.ball.y + (serverState.ball.dy * predictTime / 16);
        
        // 平滑插值
        const alpha = 0.85;
        this.gameState.ball.x = this.gameState.ball.x * (1 - alpha) + predictedBallX * alpha;
        this.gameState.ball.y = this.gameState.ball.y * (1 - alpha) + predictedBallY * alpha;
        this.gameState.ball.dx = serverState.ball.dx;
        this.gameState.ball.dy = serverState.ball.dy;
        
        // 更新对手球拍位置（使用更平滑的插值）
        const paddleAlpha = 0.3;
        if (this.playerNumber === 1) {
            const targetY = serverState.paddles.player2.y;
            const currentY = this.gameState.paddles.player2.y;
            this.gameState.paddles.player2.y = currentY + (targetY - currentY) * paddleAlpha;
        } else {
            const targetY = serverState.paddles.player1.y;
            const currentY = this.gameState.paddles.player1.y;
            this.gameState.paddles.player1.y = currentY + (targetY - currentY) * paddleAlpha;
        }
        
        // 更新分数
        if (this.gameState.paddles.player1.score !== serverState.paddles.player1.score ||
            this.gameState.paddles.player2.score !== serverState.paddles.player2.score) {
            this.gameState.paddles.player1.score = serverState.paddles.player1.score;
            this.gameState.paddles.player2.score = serverState.paddles.player2.score;
            this.updateScore();
        }
    }
    
    joinGame() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'joinGame',
                playerId: this.playerId,
                playerName: this.playerName
            }));
        }
    }
    
    startGame() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'startGame'
            }));
        }
    }
    
    startPositionSending() {
        // 定时发送位置，而不是每次移动都发送
        this.sendInterval = setInterval(() => {
            if (Math.abs(this.localPaddleY - this.lastSentPaddleY) > this.positionThreshold) {
                this.sendPaddlePosition();
                this.lastSentPaddleY = this.localPaddleY;
            }
        }, this.sendRate);
    }
    
    stopPositionSending() {
        if (this.sendInterval) {
            clearInterval(this.sendInterval);
            this.sendInterval = null;
        }
    }
    
    sendPaddlePosition() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.playerNumber) {
            this.ws.send(JSON.stringify({
                type: 'paddleMove',
                y: Math.round(this.localPaddleY) // 发送整数减少数据量
            }));
        }
    }
    
    startPingMonitoring() {
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            }
        }, 2000);
    }
    
    stopPingMonitoring() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    setupEventListeners() {
        // 鼠标控制（节流处理）
        let mouseThrottle = null;
        this.canvas.addEventListener('mousemove', (e) => {
            if (!mouseThrottle) {
                mouseThrottle = setTimeout(() => {
                    const rect = this.canvas.getBoundingClientRect();
                    const scaleY = this.canvas.height / rect.height;
                    this.mouseY = (e.clientY - rect.top) * scaleY;
                    this.updateLocalPaddle();
                    mouseThrottle = null;
                }, 16); // ~60fps
            }
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key in this.keys && !this.keys[e.key]) {
                e.preventDefault();
                this.keys[e.key] = true;
                this.updateLocalPaddle();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key in this.keys && this.keys[e.key]) {
                e.preventDefault();
                this.keys[e.key] = false;
                this.updateLocalPaddle();
            }
        });
        
        // 触摸控制（节流处理）
        let touchThrottle = null;
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!touchThrottle) {
                touchThrottle = setTimeout(() => {
                    const touch = e.touches[0];
                    const rect = this.canvas.getBoundingClientRect();
                    const scaleY = this.canvas.height / rect.height;
                    this.mouseY = (touch.clientY - rect.top) * scaleY;
                    this.updateLocalPaddle();
                    touchThrottle = null;
                }, 16);
            }
        });
    }
    
    updateLocalPaddle() {
        const moveSpeed = 10;
        const oldY = this.localPaddleY;
        
        if (this.keys.w || this.keys.ArrowUp) {
            this.localPaddleY = Math.max(0, this.localPaddleY - moveSpeed);
        } else if (this.keys.s || this.keys.ArrowDown) {
            this.localPaddleY = Math.min(350, this.localPaddleY + moveSpeed);
        } else {
            // 鼠标或触摸控制（更快的响应）
            const targetY = this.mouseY - 50;
            this.localPaddleY += (targetY - this.localPaddleY) * 0.35;
            this.localPaddleY = Math.max(0, Math.min(350, this.localPaddleY));
        }
        
        // 只有在位置改变时才更新
        if (Math.abs(oldY - this.localPaddleY) > 0.5) {
            // 更新本地球拍显示
            if (this.playerNumber === 1) {
                this.gameState.paddles.player1.y = this.localPaddleY;
            } else if (this.playerNumber === 2) {
                this.gameState.paddles.player2.y = this.localPaddleY;
            }
            this.needsRedraw = true;
        }
    }
    
    updateScore() {
        document.querySelector('.player-score').textContent = this.gameState.paddles.player1.score;
        document.querySelector('.ai-score').textContent = this.gameState.paddles.player2.score;
    }
    
    updateStatus(message) {
        document.querySelector('.status-message').textContent = message;
    }
    
    updateConnectionStatus(status) {
        const elem = document.getElementById('connectionStatus');
        if (elem) {
            elem.textContent = status;
            elem.className = this.isConnected ? 'connected' : 'disconnected';
        }
    }
    
    drawCenterLine(ctx) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    drawPaddle(ctx, x, y, isLocal) {
        ctx.fillStyle = isLocal ? '#00ff00' : '#ffffff';
        ctx.fillRect(x, y, 12, 100);
        
        if (isLocal) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2, 16, 104);
        }
    }
    
    drawBall(ctx) {
        const ball = this.gameState.ball;
        const scaleX = this.canvas.width / 800;
        const scaleY = this.canvas.height / 450;
        
        // 更新轨迹（减少频率）
        if (this.ballTrail.length === 0 || 
            Math.abs(ball.x - this.ballTrail[this.ballTrail.length - 1].x) > 5 ||
            Math.abs(ball.y - this.ballTrail[this.ballTrail.length - 1].y) > 5) {
            this.ballTrail.push({ x: ball.x, y: ball.y });
            if (this.ballTrail.length > this.maxTrailLength) {
                this.ballTrail.shift();
            }
        }
        
        // 简化轨迹绘制
        if (this.ballTrail.length > 1) {
            ctx.strokeStyle = 'rgba(0, 204, 255, 0.3)';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(
                this.ballTrail[0].x * scaleX,
                this.ballTrail[0].y * scaleY
            );
            for (let i = 1; i < this.ballTrail.length; i++) {
                ctx.lineTo(
                    this.ballTrail[i].x * scaleX,
                    this.ballTrail[i].y * scaleY
                );
            }
            ctx.stroke();
        }
        
        // 绘制球
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
            ball.x * scaleX,
            ball.y * scaleY,
            8,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    draw() {
        if (!this.needsRedraw) return;
        
        const ctx = this.offscreenCtx;
        
        // 清空画布
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        this.drawCenterLine(ctx);
        
        // 缩放坐标系
        const scaleX = this.canvas.width / 800;
        const scaleY = this.canvas.height / 450;
        
        // 绘制球拍
        const paddle1Y = this.gameState.paddles.player1.y * scaleY;
        const paddle2Y = this.gameState.paddles.player2.y * scaleY;
        
        this.drawPaddle(ctx, 30 * scaleX, paddle1Y, this.playerNumber === 1);
        this.drawPaddle(ctx, (800 - 42) * scaleX, paddle2Y, this.playerNumber === 2);
        
        // 绘制球
        this.drawBall(ctx);
        
        // 绘制玩家标识
        if (this.playerNumber) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '14px Arial';
            ctx.fillText(
                this.playerNumber === 1 ? '你' : '对手',
                30 * scaleX,
                20
            );
            ctx.fillText(
                this.playerNumber === 2 ? '你' : '对手',
                (800 - 60) * scaleX,
                20
            );
        }
        
        // 复制到主画布
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.needsRedraw = false;
    }
    
    animate(currentTime) {
        // 帧率限制
        if (currentTime - this.lastFrameTime >= this.frameInterval) {
            this.draw();
            this.lastFrameTime = currentTime;
        }
        
        this.animationId = requestAnimationFrame(this.animate);
    }
    
    cleanup() {
        this.stopPingMonitoring();
        this.stopPositionSending();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.ws) {
            this.ws.close();
        }
    }
}

// 初始化多人游戏
let multiplayerGame = null;

function initMultiplayer() {
    if (multiplayerGame) {
        multiplayerGame.cleanup();
    }
    multiplayerGame = new MultiplayerGame();
    multiplayerGame.animate(0);
    return multiplayerGame;
}