import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@yFiles': path.resolve(__dirname, 'src/@yFiles'),
            '@anyChart': path.resolve(__dirname, 'src/@anyChart'),
            '@threeJs': path.resolve(__dirname, 'src/@threeJs'),
            '@reactFlow': path.resolve(__dirname, 'src/@reactFlow'),
            '@graphModel': path.resolve(__dirname, 'src/graph-model'),
            '@graphLayout': path.resolve(__dirname, 'src/graph-layout'),
            '@graphContext': path.resolve(__dirname, 'src/graph-context'),
            '@graphData': path.resolve(__dirname, 'src/data'),
        },
    },
    optimizeDeps: {
        include: [
            'anychart',
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@xyflow/react',
            'dagre',
            'elkjs',
            'yfiles',
        ],
    },
});
