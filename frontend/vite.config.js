import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa'; // Deshabilitado temporalmente
import path from 'path';

export default defineConfig({
    plugins: [
        react(),
        // PWA deshabilitado temporalmente para desarrollo
        // VitePWA({
        //     registerType: 'autoUpdate',
        //     includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        //     manifest: {
        //         name: 'MegaMayoreo POS',
        //         short_name: 'MegaPOS',
        //         description: 'Sistema POS Offline-First para MegaMayoreo',
        //         theme_color: '#ffffff',
        //         icons: [
        //             {
        //                 src: 'pwa-192x192.png',
        //                 sizes: '192x192',
        //                 type: 'image/png'
        //             },
        //             {
        //                 src: 'pwa-512x512.png',
        //                 sizes: '512x512',
        //                 type: 'image/png'
        //             }
        //         ]
        //     }
        // })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:4847',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:4847',
                ws: true,
            }
        }
    }
});

