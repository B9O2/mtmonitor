import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        proxy: {
            // 将 API 请求代理到后端
            '/api': 'http://localhost:9783',
            '/ws': {
                target: 'ws://localhost:9783',
                ws: true,
            }
        }
    }
});
