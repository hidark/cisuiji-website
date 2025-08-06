# 🎹 电子键盘 - Electronic Keyboard

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-7.0-646cff.svg)

**一个功能丰富的在线电子键盘应用，支持MIDI文件播放、多种音色切换和实时演奏**

[在线演示](#) | [功能特色](#-功能特色) | [快速开始](#-快速开始) | [使用指南](#-使用指南)

</div>

---

## ✨ 功能特色

### 🎵 核心功能
- **MIDI播放器** - 支持标准MIDI文件（.mid/.midi）上传和播放
- **虚拟钢琴** - 64键专业键盘布局（C3-C6，3个八度）
- **多音色支持** - 8种精心调制的音色可实时切换
- **键盘映射** - 完整的计算机键盘映射，支持多行按键演奏
- **实时可视化** - 播放时键盘按键动态高亮显示

### 🎨 界面设计
- **现代化UI** - 采用玻璃拟态设计风格，视觉效果出众
- **响应式布局** - 完美适配桌面、平板和移动设备
- **深色主题** - 护眼的深色界面，支持长时间使用
- **流畅动画** - 精心设计的微交互和过渡效果
- **无障碍支持** - 完整的ARIA标签和键盘导航

### 🎸 音色列表
1. **🎹 钢琴** - 经典三角钢琴音色
2. **🎵 管风琴** - 庄严的教堂管风琴
3. **🎸 吉他** - 清脆的原声吉他
4. **🎻 小提琴** - 优雅的弦乐音色
5. **🪈 长笛** - 柔和的管乐器
6. **🎺 小号** - 明亮的铜管音色
7. **🔉 贝斯** - 低沉有力的低音
8. **🌊 合成垫音** - 空灵的电子音色

## 🚀 技术栈

### 前端框架
- **React 19.1** - 最新版React框架
- **TypeScript 5.8** - 类型安全的JavaScript超集
- **Vite 7.0** - 极速的前端构建工具

### 音频处理
- **Tone.js** - 强大的Web音频合成库
- **@tonejs/midi** - MIDI文件解析和处理
- **Web Audio API** - 原生音频处理能力

### 样式方案
- **CSS Modules** - 模块化样式管理
- **CSS Variables** - 动态主题系统
- **Responsive Design** - 移动优先的响应式设计

## 📦 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/electronic-keyboard.git
cd electronic-keyboard
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

4. **构建生产版本**
```bash
npm run build
# 或
yarn build
```

## 📖 使用指南

### 演奏键盘

#### 鼠标操作
- 点击钢琴键即可发声
- 支持同时点击多个按键

#### 键盘映射
键盘分为4行，每行对应不同的八度：

```
数字行 (C6-B6):  1  2  3  4  5  6  7  8  9  0  -  =
                 C  C# D  D# E  F  F# G  G# A  A# B

QWERTY行 (C5-B5): Q  W  E  R  T  Y  U  I  O  P  [  ]
                  C  C# D  D# E  F  F# G  G# A  A# B

ASDF行 (C4-B4):   A  S  D  F  G  H  J  K  L  ;  '
                  C  C# D  D# E  F  F# G  G# A  A#

ZXCV行 (C3-A3):   Z  X  C  V  B  N  M  ,  .  /
                  C  C# D  D# E  F  F# G  G# A
```

**修饰键功能：**
- **Shift** - 提高一个八度
- **Alt** - 降低两个八度
- **Shift + Alt** - 降低一个八度

### MIDI播放

1. **上传文件** - 点击"选择MIDI文件"按钮
2. **播放控制** - 使用播放/暂停/停止按钮控制
3. **音量调节** - 拖动音量滑块调整音量
4. **进度显示** - 实时显示播放进度
5. **音色切换** - 播放过程中可随时切换音色

### 音色选择

1. 点击右侧音色选择器
2. 从8种预设音色中选择
3. 实时生效，无需重新加载

## 📁 项目结构

```
electronic-keyboard/
├── src/
│   ├── components/          # React组件
│   │   ├── Icons/          # SVG图标组件
│   │   ├── Keyboard/       # 键盘主组件
│   │   ├── Key/           # 单个琴键组件
│   │   ├── MidiControls/  # MIDI控制面板
│   │   └── InstrumentSelector/ # 音色选择器
│   ├── services/           # 业务逻辑
│   │   └── midiPlayer.ts  # MIDI播放核心
│   ├── utils/             # 工具函数
│   │   └── musicUtils.ts  # 音乐相关工具
│   ├── App.tsx            # 主应用组件
│   ├── App.css           # 全局样式
│   └── main.tsx          # 应用入口
├── public/               # 静态资源
├── index.html           # HTML模板
├── vite.config.ts      # Vite配置
├── tsconfig.json       # TypeScript配置
└── package.json        # 项目配置
```

## 🎯 功能亮点

### 性能优化
- ⚡ 采用Vite构建，启动速度极快
- 🎨 CSS-in-JS避免样式冲突
- 📦 代码分割，按需加载
- 🚀 React 19并发特性优化

### 用户体验
- 🎹 低延迟音频响应（< 10ms）
- 📱 移动端触摸优化
- ♿ 完整的无障碍支持
- 🌐 支持PWA离线使用（开发中）

### 开发体验
- 📝 完整的TypeScript类型定义
- 🔧 ESLint + Prettier代码规范
- 📖 详细的代码注释
- 🧪 单元测试覆盖（开发中）

## 🛠️ 配置说明

### 自定义音色
编辑 `src/services/midiPlayer.ts` 中的 `INSTRUMENTS` 数组：

```typescript
{
  id: 'custom',
  name: '自定义音色',
  oscillator: { type: 'sine' },
  envelope: { 
    attack: 0.02, 
    decay: 0.1, 
    sustain: 0.3, 
    release: 1 
  }
}
```

### 键盘范围调整
修改 `src/utils/musicUtils.ts` 中的 `generate64Keys()` 函数：

```typescript
// 修改起始和结束MIDI音符号
for (let midiNumber = 48; midiNumber <= 84; midiNumber++) {
  // ...
}
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

### 开发规范
- 遵循ESLint规则
- 保持代码风格一致
- 添加必要的类型定义
- 编写清晰的提交信息

## 📋 待办事项

- [ ] 添加录音功能
- [ ] 支持MIDI输出
- [ ] 增加更多音色预设
- [ ] 实现和弦识别
- [ ] 添加节拍器功能
- [ ] 支持多轨MIDI编辑
- [ ] 实现键盘自定义映射
- [ ] 添加音效处理器
- [ ] 支持MIDI设备连接
- [ ] 实现云端存储

## 🐛 已知问题

- 某些Android设备上音频延迟较高
- iOS Safari首次播放需要用户交互
- 超大MIDI文件可能导致性能问题

## 📄 开源协议

本项目采用 MIT 协议开源 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 作者

- **开发者** - [Your Name](https://github.com/yourusername)

## 🙏 致谢

- [Tone.js](https://tonejs.github.io/) - 优秀的Web音频框架
- [React](https://react.dev/) - 用户界面构建
- [Vite](https://vitejs.dev/) - 快速的构建工具
- 所有贡献者和用户的支持

## 📮 联系方式

- 项目主页: [https://github.com/yourusername/electronic-keyboard](https://github.com/yourusername/electronic-keyboard)
- 问题反馈: [Issues](https://github.com/yourusername/electronic-keyboard/issues)
- 电子邮件: your.email@example.com

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**

Made with ❤️ by [Your Name](https://github.com/yourusername)

</div>