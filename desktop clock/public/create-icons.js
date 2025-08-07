const fs = require('fs');
const path = require('path');

// 创建一个简单的SVG图标
const createSVGIcon = (size, filename) => {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="8" fill="url(#grad1)"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" stroke="white" stroke-width="2" fill="none"/>
    <line x1="${size/2}" y1="${size/2}" x2="${size/2}" y2="${size/3}" stroke="white" stroke-width="2" stroke-linecap="round"/>
    <line x1="${size/2}" y1="${size/2}" x2="${size*2/3}" y2="${size/2}" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  
  fs.writeFileSync(path.join(__dirname, filename), svg);
  console.log(`Created ${filename}`);
};

// 创建不同尺寸的图标
createSVGIcon(256, 'icon.svg');
createSVGIcon(32, 'tray-icon.svg');

// 创建一个占位的声音文件说明
const soundReadme = `# 提醒声音文件

请在此目录下放置以下音频文件：
- notification.mp3 - 用于提醒通知的声音

推荐使用短促、清脆的提示音，时长不超过2秒。
`;

fs.writeFileSync(path.join(__dirname, 'sounds', 'README.md'), soundReadme);
console.log('Created sounds/README.md');

console.log('图标文件创建完成！');