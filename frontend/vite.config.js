import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react({
            // Allow JSX in both .jsx and .js files
            include: /\.(jsx|js)$/,
        }),
    ],
    server: {
        port: 5173,
        open: false,
        proxy: {
            // Forward all /api/* requests to Flask backend
            // Browser calls /api/resume/parse → Vite proxies to http://localhost:5000/api/resume/parse
            // This eliminates CORS entirely since the browser only talks to localhost:5173
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
