import { defineConfig } from 'vite';

// El panel usa React clásico GLOBAL (window.React) — los .jsx destructuran
// `React` y hacen `React.createElement`. Por eso NO usamos @vitejs/plugin-react
// (forzaría el runtime automático con imports de react/jsx-runtime).
// En su lugar transformamos JSX al factory clásico; React se resuelve en runtime
// desde window.React, que main.jsx fija ANTES de importar los módulos.
export default defineConfig({
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  server: { port: 5175 },
  build: { target: 'es2022', outDir: 'dist' },
});
