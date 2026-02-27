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
    },
});
