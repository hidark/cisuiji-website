const fs = require('fs');
const path = require('path');

// 分析项目文件大小的工具函数
function getDirectorySize(dirPath) {
    try {
        const stats = fs.statSync(dirPath);
        if (stats.isFile()) {
            return stats.size;
        }
        
        if (!stats.isDirectory()) return 0;
        
        let totalSize = 0;
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            totalSize += getDirectorySize(filePath);
        }
        
        return totalSize;
    } catch (error) {
        return 0;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('=== Desktop Clock 项目结构分析 ===\n');

// 分析主要目录
const directories = [
    'src',
    'public',
    'build',
    'dist',
    'node_modules'
];

console.log('📁 主要目录大小：');
directories.forEach(dir => {
    try {
        const size = getDirectorySize(dir);
        console.log(`  ${dir.padEnd(15)} ${formatBytes(size)}`);
    } catch (error) {
        console.log(`  ${dir.padEnd(15)} 不存在`);
    }
});

console.log('\n📦 node_modules 分析：');

// 分析node_modules中最大的包
try {
    const nodeModulesPath = 'node_modules';
    const packages = fs.readdirSync(nodeModulesPath);
    const packageSizes = [];
    
    packages.forEach(pkg => {
        if (pkg.startsWith('.')) return;
        
        const pkgPath = path.join(nodeModulesPath, pkg);
        const size = getDirectorySize(pkgPath);
        packageSizes.push({ name: pkg, size });
    });
    
    // 排序并显示最大的10个包
    packageSizes.sort((a, b) => b.size - a.size);
    const top10 = packageSizes.slice(0, 10);
    
    console.log('  最大的10个包：');
    top10.forEach((pkg, index) => {
        console.log(`  ${(index + 1).toString().padStart(2)}. ${pkg.name.padEnd(25)} ${formatBytes(pkg.size)}`);
    });
    
    const totalNodeModules = packageSizes.reduce((sum, pkg) => sum + pkg.size, 0);
    console.log(`\n  总计: ${formatBytes(totalNodeModules)}`);
    
} catch (error) {
    console.log('  无法分析 node_modules');
}

console.log('\n🗂️ 文件类型分析：');

// 分析项目中的依赖
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
console.log('  直接依赖：');
Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
    console.log(`    ${name.padEnd(20)} ${version}`);
});

console.log('  开发依赖：');
Object.entries(packageJson.devDependencies || {}).forEach(([name, version]) => {
    console.log(`    ${name.padEnd(20)} ${version}`);
});

console.log('\n🔍 可优化建议：');
console.log('  1. dist目录是打包输出，可删除重新生成');
console.log('  2. build目录是React构建输出，可删除重新生成');
console.log('  3. node_modules可通过npm清理无用依赖');
console.log('  4. 开发时只需要src、public、package.json等核心文件');

console.log('\n📋 核心文件清单：');
console.log('  必需保留：');
console.log('    - src/ (源代码)');
console.log('    - public/ (静态资源和Electron配置)');
console.log('    - package.json (依赖配置)');
console.log('    - package-lock.json (版本锁定)');
console.log('    - README.md (使用说明)');
console.log('');
console.log('  可删除重新生成：');
console.log('    - build/ (React构建输出)');
console.log('    - dist/ (Electron打包输出)');
console.log('    - node_modules/ (依赖包，可重新安装)');