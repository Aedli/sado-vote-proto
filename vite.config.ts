/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포 시 BASE_PATH=/저장소이름/ 으로 지정 (M6)
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
