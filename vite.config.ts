/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 상대 경로(./)로 빌드해 GitHub Pages 하위 주소(/sado-vote-proto/)에서도 그대로 동작한다. 절대 경로가 필요하면 BASE_PATH로 지정
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
