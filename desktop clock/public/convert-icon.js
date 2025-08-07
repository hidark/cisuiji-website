const fs = require('fs');
const path = require('path');

// 创建一个占位的ICO文件说明
// 注意：真正的ICO文件需要使用专门的工具转换
// 可以使用在线工具将SVG转换为ICO格式

const iconReadme = `# 图标文件说明

当前项目使用了SVG格式的图标文件。

要生成Windows ICO文件，请按以下步骤操作：

1. 使用在线转换工具（如 https://convertio.co/svg-ico/）
2. 上传 icon.svg 文件
3. 转换为 ICO 格式
4. 将生成的文件重命名为 icon.ico
5. 放置在 public 目录下

或者使用以下方法：
- 安装 electron-icon-builder: npm install --save-dev electron-icon-builder
- 在 package.json 中添加脚本: "generate-icons": "electron-icon-builder --input=./public/icon.svg --output=./public"
`;

fs.writeFileSync(path.join(__dirname, 'ICON_README.md'), iconReadme);
console.log('图标说明文件已创建');