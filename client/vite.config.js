import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import process from "process";

// Get version from root package.json
const rootPackageJson = JSON.parse(readFileSync("../package.json", "utf8"));
const version = rootPackageJson.version;

// Get build date and git info
const buildDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Use environment variables if available (set during Docker build), otherwise try git commands
let gitTag = process.env.VITE_GIT_TAG || '';
let gitBranch = process.env.VITE_GIT_BRANCH || '';
let lastCommitDate = process.env.VITE_LAST_COMMIT_DATE || '';

// If environment variables are not set, try git commands (for local development)
if (!gitTag) {
  try {
    gitTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch {
    gitTag = 'unknown';
  }
}

if (!gitBranch) {
  try {
    gitBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  } catch {
    gitBranch = 'unknown';
  }
}

if (!lastCommitDate) {
  try {
    lastCommitDate = execSync('git log -1 --format="%ci"', { encoding: 'utf8' }).trim().split(' ')[0];
  } catch {
    lastCommitDate = buildDate;
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __GIT_TAG__: JSON.stringify(gitTag),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __LAST_COMMIT_DATE__: JSON.stringify(lastCommitDate),
  },
});
