const { app, BrowserWindow, shell, session } = require("electron");

const APP_ORIGIN = process.env.LUMENX_ADMIN_ORIGIN || "https://admin.lumenxtech.in";
const ALLOWED_HOSTS = new Set([
  "admin.lumenxtech.in",
  "api.lumenxtech.in",
  "accounts.google.com",
  "appleid.apple.com",
]);

function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (ALLOWED_HOSTS.has(url.hostname)) return true;
    // Supabase / Firebase auth hosts
    if (url.hostname.endsWith(".supabase.co")) return true;
    if (url.hostname.endsWith(".firebaseapp.com")) return true;
    if (url.hostname.endsWith(".googleapis.com")) return true;
    return false;
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "LumenX Admin",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  win.loadURL(APP_ORIGIN).catch(() => {
    win.loadURL(
      `data:text/html,<h1>Unable to reach Admin</h1><p>Check your network and open ${APP_ORIGIN}</p>`,
    );
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false);
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
