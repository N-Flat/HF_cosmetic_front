import { spawnSync } from "node:child_process";
const r = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build", "--webpack"],
  { stdio: "inherit", env: { ...process.env, STATIC_DEMO: "true" } },
);
process.exit(r.status ?? 1);
