// Dev orchestrator: runs the Bun API server (8787) and the Vite dev server
// (5173, which proxies /api -> 8787) together, with clean shutdown so neither
// leaks. `bun run dev`.
export {};

const procs = [
  Bun.spawn(["bun", "run", "server/index.ts"], {
    env: { ...process.env, PORT: process.env.API_PORT ?? "8787" },
    stdout: "inherit",
    stderr: "inherit",
  }),
  Bun.spawn(["bunx", "vite"], {
    env: { ...process.env, API_PORT: process.env.API_PORT ?? "8787" },
    stdout: "inherit",
    stderr: "inherit",
  }),
];

function shutdown() {
  for (const p of procs) {
    try {
      p.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.race(procs.map((p) => p.exited));
shutdown();
