# 🏓 Ping Pong Game

一个使用纯HTML5、CSS3和JavaScript开发的现代化乒乓球游戏，具有流畅的动画效果和智能AI对手。

![GitHub](https://img.shields.io/github/license/yourusername/PingPong)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34C26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ 游戏特性

### 🎮 核心玩法
- **经典乒乓球对战**：玩家对战智能AI
- **11分制**：先得11分者获胜
- **物理模拟**：真实的球体碰撞和反弹角度计算
- **渐进式难度**：球速随对战进行逐渐增加

### 🎯 控制方式
- **🖱️ 鼠标控制**：移动鼠标控制球拍
- **⌨️ 键盘控制**：W/S键或↑/↓方向键
- **📱 触摸控制**：移动端触摸屏幕控制

### 🎨 视觉效果
- **霓虹光效**：赛博朋克风格的发光效果
- **粒子拖尾**：球体移动时的动态轨迹
- **响应式设计**：自适应各种屏幕尺寸
- **流畅动画**：60FPS的丝滑体验

### ⚙️ 游戏设置
- **音效开关**：可开启/关闭碰撞音效
- **难度选择**：
  - 🟢 简单：AI反应较慢，误差较大
  - 🟡 普通：平衡的游戏体验
  - 🔴 困难：AI反应迅速，精准度高

## 🚀 快速开始

### 在线游玩
直接打开 `index.html` 文件即可开始游戏。

### 本地部署
```bash
# 克隆仓库
git clone https://github.com/yourusername/PingPong.git

# 进入项目目录
cd PingPong

# 使用任意HTTP服务器运行（可选）
# 例如使用Python
python -m http.server 8000

# 或使用Node.js的http-server
npx http-server
```

然后在浏览器中访问 `http://localhost:8000`

## 🎮 操作说明

| 操作 | 方法 |
|------|------|
| 移动球拍 | 鼠标移动 / W,S键 / ↑,↓键 / 触摸屏幕 |
| 开始游戏 | 点击"开始游戏"按钮 |
| 暂停/继续 | 点击"暂停"按钮 |
| 重置游戏 | 点击"重置"按钮 |
| 游戏设置 | 点击"设置"按钮 |

## 🏗️ 技术架构

### 项目结构
```
PingPong/
├── index.html      # 游戏界面
├── game.js         # 游戏逻辑
├── style.css       # 界面样式
└── README.md       # 项目文档
```

### 核心技术
- **Canvas 2D API**：游戏渲染
- **Web Audio API**：音效系统
- **RequestAnimationFrame**：流畅动画
- **面向对象设计**：模块化代码结构

### 主要类
- `Game`：游戏主控制器
- `Paddle`：球拍类（玩家/AI）
- `Ball`：球体物理和渲染
- `AudioManager`：音效管理（单例模式）

## 🔧 性能优化

### 已实施的优化
- ✅ **内存管理**：AudioContext单例，避免内存泄漏
- ✅ **渲染优化**：减少shadow重绘，使用缓存
- ✅ **数据结构**：环形缓冲区替代数组shift操作
- ✅ **响应式Canvas**：动态调整画布尺寸
- ✅ **配置管理**：集中管理游戏常量

### 性能指标
- 稳定60 FPS
- 内存占用 < 50MB
- 首次加载 < 1秒
- 支持低端设备流畅运行

## 📱 浏览器兼容性

| 浏览器 | 支持版本 |
|--------|----------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Mobile Chrome | 90+ |
| Mobile Safari | 14+ |

## 🌐 在线对战功能

### 安装和启动
```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 开发模式（自动重启）
npm run dev
```

服务器启动后访问 http://localhost:3000

### 在线对战说明
1. 选择"在线对战"模式
2. 点击"连接服务器"连接到游戏服务器
3. 自动匹配其他玩家或等待玩家加入
4. 两位玩家就绪后开始游戏
5. 实时显示网络延迟
6. 支持断线重连

### 网络特性
- **WebSocket通信**：低延迟实时对战
- **自动房间匹配**：智能分配游戏房间
- **网络同步**：平滑的游戏状态同步
- **延迟补偿**：优化网络延迟体验

## 🛠️ 开发计划

### 已完成 ✅
- [x] 多人在线对战
- [x] 房间系统
- [x] 网络延迟显示
- [x] 断线重连功能

### 即将推出
- [ ] 排行榜系统
- [ ] 自定义球拍皮肤
- [ ] 成就系统
- [ ] 音乐背景

### 长期计划
- [ ] WebGL渲染升级
- [ ] 锦标赛模式
- [ ] 回放系统
- [ ] 社交分享功能

## 📄 许可证

本项目采用 MIT 许可证。查看 [LICENSE](LICENSE) 文件了解更多信息。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 👏 致谢

- 游戏设计灵感来源于经典街机游戏 Pong
- 使用了现代Web技术实现复古游戏体验

## 📞 联系方式

- 项目主页：[https://github.com/yourusername/PingPong](https://github.com/yourusername/PingPong)
- 问题反馈：[Issues](https://github.com/yourusername/PingPong/issues)

---

**享受游戏！** 🎮✨