import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/asr': {
        target: 'http://172.29.184.113:9000',
        changeOrigin: true,
        rewrite: (path) => path, // 不再移除路径前缀
        secure: false
      }
    }
  }
})