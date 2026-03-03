// [claude-code 2026-02-26] Ensure OAuth popups work for embedded webviews.

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");

let mainWindow = null;

const shouldAllowInAppPopup = (urlString) => {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();

    // OAuth providers commonly used by Notion / external platforms.
    if (host === "accounts.google.com") return true;
    if (host.endsWith(".accounts.google.com")) return true;
    if (host === "appleid.apple.com") return true;
    if (host.endsWith(".notion.so")) return true;
    if (host.endsWith(".notion.site")) return true;

    // TradeSea iframe login
    if (host === "app.tradesea.ai") return true;
    if (host === "tradesea.ai") return true;

    return false;
  } catch {
    return false;
  }
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 980,
    title: "Pulse",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      nativeWindowOpen: true,
    },
  });

  const rendererPath = path.join(__dirname, "..", "frontend", "dist", "index.html");
  win.loadFile(rendererPath);
  mainWindow = win;
}

app.whenReady().then(() => {
  createWindow();

  // Handle window.open from embedded <webview> tags.
  app.on("web-contents-created", (_event, contents) => {
    try {
      if (contents.getType && contents.getType() === "webview") {
        contents.setWindowOpenHandler(({ url }) => {
          if (shouldAllowInAppPopup(url)) {
            // Allow an in-app popup so the auth session stays in the same partition.
            return {
              action: "allow",
              overrideBrowserWindowOptions: {
                width: 520,
                height: 760,
                parent: mainWindow ?? undefined,
                modal: false,
                title: "Sign in",
                webPreferences: {
                  contextIsolation: true,
                  nodeIntegration: false,
                  nativeWindowOpen: true,
                },
              },
            };
          }

          // For non-auth links, open externally to avoid popup spam.
          shell.openExternal(url).catch(() => {});
          return { action: "deny" };
        });
      }
    } catch {
      // Best-effort only.
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("toggle-mini-widget", () => {
  // Placeholder for widget toggle behavior.
  return { ok: true };
});
