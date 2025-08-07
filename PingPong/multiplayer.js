// 多人游戏客户端代码
class MultiplayerGame {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerNumber = null;
        this.playerId = Math.random().toString(36).substr(2, 9);
        this.playerName = localStorage.getItem('playerName') || `Player_${this.playerId.substr(0, 4)}`;
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameState = {
            ball: { x: 400, y: 225, dx: 0, dy: 0 },
            paddles: {
                player1: { y: 175, score: 0 },
                player2: { y: 175, score: 0 }
            },
            status: 'waiting'
        };
        
        this.localPaddleY = 175;
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
        
        // 球轨迹
        this.ballTrail = [];
        
        this.setupCanvas();
        this.setupEventListeners();
        this.animate = this.animate.bind(this);
    }
    
    setupCanvas() {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const aspectRatio = 450 / 800;
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
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
                break;
                
            case 'canStart':
                this.updateStatus(data.message);
                document.getElementById('startOnlineBtn').disabled = false;
                break;
                
            case 'gameStarted':
                this.gameState = data.gameState;
                this.updateStatus('游戏开始！');
                document.getElementById('startOnlineBtn').disabled = true;
                break;
                
            case 'gameUpdate':
                this.updateGameState(data.gameState);
                break;
                
            case 'gameEnded':
                this.gameState.status = 'ended';
                const winnerText = data.winner === this.playerNumber ? '你赢了！' : '你输了！';
                this.updateStatus(`游戏结束 - ${winnerText}`);
                document.getElementById('startOnlineBtn').disabled = false;
                break;
                
            case 'pong':
                this.latency = Date.now() - data.timestamp;
                document.getElementById('latency').textContent = `延迟: ${this.latency}ms`;
                break;
        }
    }
    
    updateGameState(serverState) {
        // 平滑插值
        const alpha = 0.8;
        this.gameState.ball.x = this.gameState.ball.x * (1 - alpha) + serverState.ball.x * alpha;
        this.gameState.ball.y = this.gameState.ball.y * (1 - alpha) + serverState.ball.y * alpha;
        this.gameState.ball.dx = serverState.ball.dx;
        this.gameState.ball.dy = serverState.ball.dy;
        
        // 更新对手球拍位置
        if (this.playerNumber === 1) {
            this.gameState.paddles.player2.y = serverState.paddles.player2.y;
        } else {
            this.gameState.paddles.player1.y = serverState.paddles.player1.y;
        }
        
        // 更新分数
        this.gameState.paddles.player1.score = serverState.paddles.player1.score;
        this.gameState.paddles.player2.score = serverState.paddles.player2.score;
        
        this.updateScore();
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
    
    sendPaddlePosition() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && this.playerNumber) {
            this.ws.send(JSON.stringify({
                type: 'paddleMove',
                y: this.localPaddleY
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
        // 鼠标控制
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.canvas.height / rect.height;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            this.updateLocalPaddle();
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (e.key in this.keys) {
                e.preventDefault();
                this.keys[e.key] = true;
                this.updateLocalPaddle();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key in this.keys) {
                e.preventDefault();
                this.keys[e.key] = false;
                this.updateLocalPaddle();
            }
        });
        
        // 触摸控制
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.canvas.height / rect.height;
            this.mouseY = (touch.clientY - rect.top) * scaleY;
            this.updateLocalPaddle();
        });
    }
    
    updateLocalPaddle() {
        const moveSpeed = 8;
        
        if (this.keys.w || this.keys.ArrowUp) {
            this.localPaddleY = Math.max(0, this.localPaddleY - moveSpeed);
        } else if (this.keys.s || this.keys.ArrowDown) {
            this.localPaddleY = Math.min(350, this.localPaddleY + moveSpeed);
        } else {
            // 鼠标或触摸控制
            const targetY = this.mouseY - 50;
            this.localPaddleY += (targetY - this.localPaddleY) * 0.2;
            this.localPaddleY = Math.max(0, Math.min(350, this.localPaddleY));
        }
        
        // 更新本地球拍显示
        if (this.playerNumber === 1) {
            this.gameState.paddles.player1.y = this.localPaddleY;
        } else if (this.playerNumber === 2) {
            this.gameState.paddles.player2.y = this.localPaddleY;
        }
        
        // 发送到服务器
        this.sendPaddlePosition();
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
    
    drawPaddle(x, y, isLocal) {
        this.ctx.fillStyle = isLocal ? '#00ff00' : '#ffffff';
        this.ctx.fillRect(x, y, 12, 100);
        
        if (isLocal) {
            this.ctx.strokeStyle = '#00ff00';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 2, y - 2, 16, 104);
        }
    }
    
    drawBall() {
        const ball = this.gameState.ball;
        
        // 更新轨迹
        this.ballTrail.push({ x: ball.x, y: ball.y });
        if (this.ballTrail.length > 10) {
            this.ballTrail.shift();
        }
        
        // 绘制轨迹
        this.ballTrail.forEach((point, index) => {
            this.ctx.globalAlpha = (index + 1) / this.ballTrail.length * 0.5;
            this.ctx.fillStyle = '#00ccff';
            this.ctx.beginPath();
            this.ctx.arc(
                point.x * (this.canvas.width / 800),
                point.y * (this.canvas.height / 450),
                8 * ((index + 1) / this.ballTrail.length),
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });
        
        // 绘制球
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(
            ball.x * (this.canvas.width / 800),
            ball.y * (this.canvas.height / 450),
            8,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawCenterLine();
        
        // 缩放坐标系
        const scaleX = this.canvas.width / 800;
        const scaleY = this.canvas.height / 450;
        
        // 绘制球拍
        const paddle1Y = this.gameState.paddles.player1.y * scaleY;
        const paddle2Y = this.gameState.paddles.player2.y * scaleY;
        
        this.drawPaddle(30 * scaleX, paddle1Y, this.playerNumber === 1);
        this.drawPaddle((800 - 42) * scaleX, paddle2Y, this.playerNumber === 2);
        
        // 绘制球
        this.drawBall();
        
        // 绘制玩家标识
        if (this.playerNumber) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(
                this.playerNumber === 1 ? '你' : '对手',
                30 * scaleX,
                20
            );
            this.ctx.fillText(
                this.playerNumber === 2 ? '你' : '对手',
                (800 - 60) * scaleX,
                20
            );
        }
    }
    
    animate() {
        this.draw();
        requestAnimationFrame(this.animate);
    }
    
    cleanup() {
        this.stopPingMonitoring();
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
    multiplayerGame.animate();
    return multiplayerGame;
}