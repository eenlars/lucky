import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    resolve: true,
  },
  tsconfig: './tsconfig.build.json',
  clean: true,
  sourcemap: true,
})