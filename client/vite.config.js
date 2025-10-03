import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import process from "node:process";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        "/api": "http://localhost:8000",
      },
    },
    define: {
      __RELEASE_VERSION__: JSON.stringify(env.VITE_RELEASE_VERSION || 'unknown'),
      __LAST_COMMIT_DATE__: JSON.stringify(env.VITE_LAST_COMMIT_DATE || new Date().toISOString().split('T')[0]),
    },
  };
});