import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig(({ command, mode }) => {
   // Working against the ucode test project: with UCODE_API_KEY in the
   // environment or .env.local, the dev server forwards /ucode to the ucode
   // admin API and adds the key, so the browser never holds it. A build has no
   // key and runs on the sample data until staff sign in to ucode (docs/ERP.md §9).
   const ucodeKey =
      command === 'serve' ? loadEnv(mode, process.cwd(), '').UCODE_API_KEY : '';

   return {
      envPrefix: 'VITE_',
      define: { __UCODE__: JSON.stringify(Boolean(ucodeKey)) },
      server: {
         port: 3000,
         ...(ucodeKey && {
            proxy: {
               '/ucode': {
                  target: 'https://api.admin.u-code.io',
                  changeOrigin: true,
                  rewrite: (path) => path.replace(/^\/ucode/, ''),
                  headers: { Authorization: 'API-KEY', 'X-API-KEY': ucodeKey },
               },
            },
         }),
      },
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
   };
});
