import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    build: { outDir: 'out/main' },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      // Preload em sandbox não suporta ESM: gera um único arquivo CommonJS.
      rollupOptions: {
        input: {
          index: resolve(import.meta.dirname, 'src/preload/index.ts'), // janela de configurações
          chat: resolve(import.meta.dirname, 'src/preload/chat.ts'), // janela do Google Chat
          audio: resolve(import.meta.dirname, 'src/preload/audio.ts'), // player de sons (oculto)
        },
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    build: {
      outDir: resolve(import.meta.dirname, 'out/renderer'),
      minify: true,
      rollupOptions: {
        input: {
          index: resolve(import.meta.dirname, 'src/renderer/index.html'),
          audio: resolve(import.meta.dirname, 'src/renderer/audio.html'),
        },
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
