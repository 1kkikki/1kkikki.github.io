// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": {
        target: "https://allmeet-backend.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
