import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/allmeet/' : '/',
  plugins: [react() as PluginOption],  // ✅ 타입 맞춰줌
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      "/auth": "http://127.0.0.1:5000", // ✅ Flask 프록시 연결
    },
  },
});
