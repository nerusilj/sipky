import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public/fonts',
  plugins: [{
    name: 'cast-font-paths',
    enforce: 'pre',
    transform(css, id) {
      // Samostatný receiver publikuje pouze písma a jejich licence z public/.
      if (id.endsWith('/src/styles.css')) return css.replaceAll("url('/fonts/", "url('/");
    },
  }],
  build: {
    target: 'chrome87',
    cssTarget: 'chrome87',
    outDir: 'dist-cast',
    rolldownOptions: { input: 'receiver.html' },
  },
});
