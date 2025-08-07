import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 优化构建性能
  build: {
    // 启用更好的代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型依赖单独打包
          'tone': ['tone'],
          'tensorflow': ['@tensorflow/tfjs', '@spotify/basic-pitch'],
          'midi': ['@tonejs/midi'],
          'wavesurfer': ['wavesurfer.js'],
          'vendor': ['react', 'react-dom']
        }
      }
    },
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 设置更大的chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // 生成source map用于生产环境调试
    sourcemap: false
  },
  
  // 优化开发服务器性能
  server: {
    // 启用HMR
    hmr: true,
    // 预加载依赖
    fs: {
      strict: false
    }
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'tone',
      '@tonejs/midi',
      '@tensorflow/tfjs',
      '@spotify/basic-pitch',
      'wavesurfer.js'
    ],
    exclude: []
  },
  
  // 性能优化
  esbuild: {
    // 删除console和debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // 启用更快的构建
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})