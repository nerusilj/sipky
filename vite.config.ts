import { defineConfig } from 'vite';

// Absolutní cesty: projekt sám leží ve složce outputs, nesmíme ignorovat jeho zdroje.
const projectRoot = decodeURIComponent(new URL('.', import.meta.url).pathname).replace(/^\/(?=[A-Za-z]:\/)/, '');

export default defineConfig({
  clearScreen: false,
  server: { host: '127.0.0.1', port: 1420, strictPort: true, watch: { ignored: ['src-tauri/target/**', 'src-tauri/tts-runtime*/**', 'outputs/**', '.test-tmp/**'].map(path => `${projectRoot}${path}`) } },
  optimizeDeps: { entries: ['index.html'] },
  envPrefix: ['VITE_'],
  build: { target: ['es2022', 'chrome105', 'safari15'] },
});
