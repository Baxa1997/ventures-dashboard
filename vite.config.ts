import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
   envPrefix: 'VITE_',
   server: { port: 3000 },
   resolve: {
      alias: {
         '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
         '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
         '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      },
   },
   plugins: [react(), tailwindcss(), checker({ typescript: true })],
   build: {
      outDir: 'dist',
      sourcemap: false,
   },
});
