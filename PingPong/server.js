const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 游戏房间管理
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.gameState = {
            ball: { x: 400, y: 225, dx: 5, dy: 3 },
            paddles: {
                player1: { y: 175, score: 0 },
                player2: { y: 175, score: 0 }
            },
            status: 'waiting',
            lastUpdate: Date.now()
        };
        this.intervalId = null;
    }

    addPlayer(ws, playerInfo) {
        if (this.players.length >= 2) {
            return false;
        }
        
        const player = {
            ws,
            id: playerInfo.id,
            name: playerInfo.name || `Player ${this.players.length + 1}`,
            number: this.players.length + 1,
            ready: false
        };
        
        this.players.push(player);
        
        // 通知玩家加入
        this.broadcast({
            type: 'playerJoined',
            player: {
                id: player.id,
                name: player.name,
                number: player.number
            },
            totalPlayers: this.players.length
        });
        
        // 发送初始游戏状态
        ws.send(JSON.stringify({
            type: 'gameInit',
            roomId: this.id,
            playerNumber: player.number,
            gameState: this.gameState
        }));
        
        // 如果两个玩家都在，可以开始游戏
        if (this.players.length === 2) {
            this.broadcast({
                type: 'canStart',
                message: '两位玩家已就绪，可以开始游戏'
            });
        }
        
        return true;
    }

    removePlayer(ws) {
        const index = this.players.findIndex(p => p.ws === ws);
        if (index !== -1) {
            const player = this.players[index];
            this.players.splice(index, 1);
            
            // 停止游戏
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
            this.gameState.status = 'waiting';
            
            // 通知其他玩家
            this.broadcast({
                type: 'playerLeft',
                player: {
                    id: player.id,
                    name: player.name
                },
                totalPlayers: this.players.length
            }, ws);
            
            // 如果房间空了，返回true以便删除房间
            return this.players.length === 0;
        }
        return false;
    }

    startGame() {
        if (this.players.length !== 2) {
            return false;
        }
        
        this.gameState.status = 'playing';
        this.gameState.ball = { x: 400, y: 225, dx: 5, dy: 3 };
        this.gameState.paddles.player1.score = 0;
        this.gameState.paddles.player2.score = 0;
        
        // 开始游戏循环
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.intervalId = setInterval(() => {
            this.updateGameState();
        }, 1000 / 60); // 60 FPS
        
        this.broadcast({
            type: 'gameStarted',
            gameState: this.gameState
        });
        
        return true;
    }

    updateGameState() {
        if (this.gameState.status !== 'playing') {
            return;
        }
        
        const ball = this.gameState.ball;
        const paddles = this.gameState.paddles;
        
        // 更新球位置
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 边界碰撞
        if (ball.y <= 8 || ball.y >= 442) {
            ball.dy = -ball.dy;
        }
        
        // 球拍碰撞检测
        // 玩家1球拍
        if (ball.x <= 42 && ball.x >= 30 &&
            ball.y >= paddles.player1.y && 
            ball.y <= paddles.player1.y + 100) {
            ball.dx = Math.abs(ball.dx) * 1.05;
            ball.dx = Math.min(ball.dx, 15);
            
            const relativeIntersectY = (paddles.player1.y + 50) - ball.y;
            const normalizedIntersectY = relativeIntersectY / 50;
            const bounceAngle = normalizedIntersectY * Math.PI / 4;
            ball.dy = ball.dx * -Math.sin(bounceAngle);
        }
        
        // 玩家2球拍
        if (ball.x >= 758 && ball.x <= 770 &&
            ball.y >= paddles.player2.y && 
            ball.y <= paddles.player2.y + 100) {
            ball.dx = -Math.abs(ball.dx) * 1.05;
            ball.dx = Math.max(ball.dx, -15);
            
            const relativeIntersectY = (paddles.player2.y + 50) - ball.y;
            const normalizedIntersectY = relativeIntersectY / 50;
            const bounceAngle = normalizedIntersectY * Math.PI / 4;
            ball.dy = -ball.dx * -Math.sin(bounceAngle);
        }
        
        // 得分检测
        if (ball.x < 0) {
            paddles.player2.score++;
            this.resetBall();
            this.checkWin();
        } else if (ball.x > 800) {
            paddles.player1.score++;
            this.resetBall();
            this.checkWin();
        }
        
        // 广播游戏状态
        this.broadcast({
            type: 'gameUpdate',
            gameState: this.gameState
        });
    }

    resetBall() {
        this.gameState.ball = {
            x: 400,
            y: 225,
            dx: (Math.random() > 0.5 ? 1 : -1) * 5,
            dy: (Math.random() * 2 - 1) * 3
        };
    }

    checkWin() {
        const paddles = this.gameState.paddles;
        if (paddles.player1.score >= 11 || paddles.player2.score >= 11) {
            this.gameState.status = 'ended';
            const winner = paddles.player1.score >= 11 ? 1 : 2;
            
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
            this.broadcast({
                type: 'gameEnded',
                winner: winner,
                scores: {
                    player1: paddles.player1.score,
                    player2: paddles.player2.score
                }
            });
        }
    }

    updatePaddle(playerNumber, y) {
        if (playerNumber === 1) {
            this.gameState.paddles.player1.y = Math.max(0, Math.min(350, y));
        } else if (playerNumber === 2) {
            this.gameState.paddles.player2.y = Math.max(0, Math.min(350, y));
        }
    }

    broadcast(message, exclude = null) {
        const data = JSON.stringify(message);
        this.players.forEach(player => {
            if (player.ws !== exclude && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(data);
            }
        });
    }
}

// 房间管理
const rooms = new Map();
let roomIdCounter = 1;

// 查找或创建房间
function findOrCreateRoom() {
    // 查找有空位的房间
    for (const [roomId, room] of rooms) {
        if (room.players.length < 2) {
            return room;
        }
    }
    
    // 创建新房间
    const roomId = `room_${roomIdCounter++}`;
    const room = new GameRoom(roomId);
    rooms.set(roomId, room);
    return room;
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    let currentRoom = null;
    let playerNumber = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'joinGame':
                    if (!currentRoom) {
                        currentRoom = findOrCreateRoom();
                        const joined = currentRoom.addPlayer(ws, {
                            id: data.playerId || Math.random().toString(36).substr(2, 9),
                            name: data.playerName
                        });
                        
                        if (joined) {
                            const player = currentRoom.players.find(p => p.ws === ws);
                            playerNumber = player.number;
                            console.log(`Player joined room ${currentRoom.id} as Player ${playerNumber}`);
                        } else {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: '房间已满'
                            }));
                            currentRoom = null;
                        }
                    }
                    break;
                
                case 'startGame':
                    if (currentRoom) {
                        currentRoom.startGame();
                    }
                    break;
                
                case 'paddleMove':
                    if (currentRoom && playerNumber) {
                        currentRoom.updatePaddle(playerNumber, data.y);
                    }
                    break;
                
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        if (currentRoom) {
            const shouldDeleteRoom = currentRoom.removePlayer(ws);
            if (shouldDeleteRoom) {
                rooms.delete(currentRoom.id);
                console.log(`Room ${currentRoom.id} deleted`);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});