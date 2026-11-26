// Application de bureau Équipia : lance le serveur embarqué puis l'affiche dans une fenêtre.
const { app, BrowserWindow, shell, utilityProcess, dialog } = require("electron");
const net = require("net");
const path = require("path");
const fs = require("fs");

// Dossier des données : nom sans accent, identique sur toutes les plateformes.
app.setName("Équipia");
app.setPath("userData", path.join(app.getPath("appData"), "Equipia"));

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win = null;
let server = null;
let quitting = false;
const logFile = () => path.join(app.getPath("userData"), "equipia.log");
const log = (msg) => {
  try {
    fs.appendFileSync(logFile(), `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
};

// Port fixe si possible : la session reste valide d'un lancement à l'autre
// et l'adresse de retour des connexions (Google…) ne change pas.
function freePort(start = 3210, end = 3240) {
  return new Promise((resolve, reject) => {
    const tryPort = (p) => {
      if (p > end) return reject(new Error("Aucun port libre"));
      const s = net.createServer();
      s.once("error", () => tryPort(p + 1));
      s.once("listening", () => s.close(() => resolve(p)));
      s.listen(p, "127.0.0.1");
    };
    tryPort(start);
  });
}

async function waitForServer(url, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Le serveur n'a pas démarré à temps");
}

function serverDir() {
  // Installé : dans les ressources de l'application. En développement : desktop/server.
  const packed = path.join(process.resourcesPath, "server");
  return fs.existsSync(packed) ? packed : path.join(__dirname, "server");
}

const SPLASH = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:radial-gradient(ellipse at top left,#eef2ff,#f8fafc 45%,#f1f5f9);color:#1b1530">
<div style="text-align:center"><div style="width:72px;height:72px;margin:0 auto 18px;border-radius:20px;background:linear-gradient(135deg,#8b5cf6,#ec4899,#fbbf24);display:grid;place-items:center;color:#fff;font-size:36px;box-shadow:0 12px 30px rgba(139,92,246,.35)">✦</div>
<div style="font-size:22px;font-weight:700">Équipia</div><div style="margin-top:6px;color:#64748b;font-size:14px">Votre équipe arrive au bureau…</div></div></body></html>`)}`;

async function start() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: "Équipia",
    backgroundColor: "#f8fafc",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadURL(SPLASH);

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const dataDir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dir = serverDir();
  log(`démarrage du serveur ${dir} sur ${origin}`);

  server = utilityProcess.fork(path.join(dir, "server.js"), [], {
    cwd: dir,
    stdio: "pipe",
    serviceName: "Équipia serveur",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATA_DIR: dataDir,
      APP_URL: origin,
      EQUIPIA_DESKTOP: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  server.stdout?.on("data", (d) => log(String(d).trim()));
  server.stderr?.on("data", (d) => log(String(d).trim()));
  server.on("exit", (code) => {
    log(`serveur arrêté (code ${code})`);
    if (!quitting) {
      dialog.showErrorBox("Équipia s'est arrêté", `Le moteur d'Équipia s'est arrêté (code ${code}).\nDétails : ${logFile()}`);
      app.quit();
    }
  });

  try {
    await waitForServer(`${origin}/login`);
  } catch (e) {
    dialog.showErrorBox("Équipia ne démarre pas", `${e.message}.\nDétails : ${logFile()}`);
    app.quit();
    return;
  }

  // Les liens qui ouvrent un nouvel onglet (aide, console Anthropic…) partent dans le navigateur.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.loadURL(origin);
  checkUpdates();
}

// Mises à jour automatiques (Windows et Linux ; sur Mac il faut une app signée).
function checkUpdates() {
  if (!app.isPackaged || process.platform === "darwin") return;
  try {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
    autoUpdater.checkForUpdatesAndNotify().catch((e) => log(`mise à jour : ${e.message}`));
  } catch (e) {
    log(`mise à jour indisponible : ${e.message}`);
  }
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("before-quit", () => {
  quitting = true;
  server?.kill();
});

app.on("window-all-closed", () => app.quit());

app.whenReady().then(start);
