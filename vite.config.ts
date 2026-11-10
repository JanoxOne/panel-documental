/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => ({
  // El modo demo empaqueta todo (código, estilos, tipografías y logo) en un solo HTML.
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react()],
  build: mode === 'demo' ? { outDir: 'demo', assetsInlineLimit: Number.MAX_SAFE_INTEGER } : {},
  test: {
    environment: 'jsdom',
    setupFiles: 'src/pruebas/setup.ts',
    css: false,
  },
}))
