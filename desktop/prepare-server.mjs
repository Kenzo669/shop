// Prépare le serveur Équipia embarqué dans l'application de bureau :
// build Next.js autonome -> desktop/server (fichiers statiques et images compris).
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const out = path.join(here, "server");
const run = (cmd, cwd, env = {}) => execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, ...env } });

if (!process.argv.includes("--skip-build")) {
  run("npm run build", root, { EQUIPIA_STANDALONE: "1", NEXT_TELEMETRY_DISABLED: "1" });
}
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, ".next", "standalone"), out, { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
// Aucune donnée de développement ne doit partir dans l'installateur.
for (const f of ["data", ".env", ".env.local", "presentation", "desktop"]) fs.rmSync(path.join(out, f), { recursive: true, force: true });

// better-sqlite3 utilise N-API : ses binaires précompilés (Mac, Windows, Linux) fonctionnent tels quels dans Electron.
console.log(`Serveur prêt dans ${out}`);
