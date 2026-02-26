const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

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
    },
  });

  const rendererPath = path.join(__dirname, "..", "frontend", "dist", "index.html");
  win.loadFile(rendererPath);
}

app.whenReady().then(() => {
  createWindow();

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
