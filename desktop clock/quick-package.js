const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  Desktop Clock - 快速打包工具');
console.log('========================================');
console.log('');

// 检查build目录
if (!fs.existsSync('build')) {
    console.log('[1/3] 构建React生产版本...');
    execSync('npm run build', { stdio: 'inherit' });
} else {
    console.log('[1/3] 使用现有的build目录');
}

// 创建便携版目录
const portableDir = path.join(__dirname, 'desktop-clock-portable');
const resourcesDir = path.join(portableDir, 'resources');
const appDir = path.join(resourcesDir, 'app');

console.log('[2/3] 创建便携版目录结构...');

// 清理旧目录
if (fs.existsSync(portableDir)) {
    fs.rmSync(portableDir, { recursive: true, force: true });
}

// 创建目录结构
fs.mkdirSync(portableDir, { recursive: true });
fs.mkdirSync(resourcesDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });

// 复制必要文件
console.log('[3/3] 复制文件...');

// 复制package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
packageJson.main = 'public/electron.js';
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJson, null, 2));

// 复制文件夹
const copyRecursive = (src, dest) => {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
};

// 复制build目录
copyRecursive('build', path.join(appDir, 'build'));

// 复制public目录
copyRecursive('public', path.join(appDir, 'public'));

// 复制node_modules中的必要依赖
const dependencies = [
    'electron-store',
    'conf',
    'dot-prop',
    'atomically',
    'debounce-fn',
    'json-schema-typed',
    'env-paths',
    'ajv',
    'ajv-formats'
];

const nodeModulesDir = path.join(appDir, 'node_modules');
fs.mkdirSync(nodeModulesDir, { recursive: true });

dependencies.forEach(dep => {
    const srcPath = path.join('node_modules', dep);
    const destPath = path.join(nodeModulesDir, dep);
    if (fs.existsSync(srcPath)) {
        copyRecursive(srcPath, destPath);
    }
});

// 创建启动脚本
const launcherContent = `@echo off
cd /d "%~dp0"
if not exist "electron.exe" (
    echo 错误：找不到electron.exe
    echo 请先下载Electron：https://github.com/electron/electron/releases
    echo 将electron.exe放在此目录下
    pause
    exit
)
start electron.exe resources\\app
`;

fs.writeFileSync(path.join(portableDir, 'Desktop Clock.bat'), launcherContent);

// 创建说明文件
const readmeContent = `Desktop Clock - 便携版

使用方法：
1. 下载Electron运行时：
   https://github.com/electron/electron/releases/latest
   选择 electron-v*-win32-x64.zip

2. 解压Electron到此目录

3. 双击运行 "Desktop Clock.bat"

目录结构应该如下：
desktop-clock-portable/
├── electron.exe (需要下载)
├── Desktop Clock.bat
├── resources/
│   └── app/
│       ├── build/
│       ├── public/
│       └── package.json
└── 其他Electron文件...
`;

fs.writeFileSync(path.join(portableDir, 'README.txt'), readmeContent);

console.log('');
console.log('========================================');
console.log('  打包完成！');
console.log('========================================');
console.log('');
console.log('便携版位置：');
console.log(portableDir);
console.log('');
console.log('下一步：');
console.log('1. 下载Electron运行时并解压到便携版目录');
console.log('2. 运行 Desktop Clock.bat');
console.log('');
console.log('或者直接运行开发版：npm start + npm run electron-dev');