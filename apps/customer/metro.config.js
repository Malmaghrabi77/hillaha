const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// ── 1. Watch all files in the monorepo ────────────────────────────────────────
config.watchFolders = [workspaceRoot];

// ── 2. Resolve packages from both the app's node_modules AND the monorepo root
//       (pnpm shamefully-hoist puts everything at the root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// ── 3. CRITICAL for pnpm: all packages in node_modules are SYMLINKS pointing
//       to the .pnpm virtual store. Without this, Metro on Linux (EAS cloud)
//       silently fails to resolve react, expo-router, etc., producing a broken
//       bundle that crashes before any JS runs — leaving the native splash frozen.
config.resolver.unstable_enableSymlinks = true;

// ── 4. Prevent Metro from walking up the directory tree for modules.
//       Forces resolution to use nodeModulesPaths only (avoids duplicate packages).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
