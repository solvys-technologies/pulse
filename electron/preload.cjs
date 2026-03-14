const { contextBridge, ipcRenderer } = require("electron");

let cliOutputCallback = null;
ipcRenderer.on("cli-output", (_event, data) => {
  if (typeof cliOutputCallback === "function") cliOutputCallback(data);
});

contextBridge.exposeInMainWorld("electron", {
  toggleMiniWidget: async () => {
    try {
      await ipcRenderer.invoke("toggle-mini-widget");
    } catch {
      // no-op fallback for renderer calls
    }
  },
  runShellCommand: (command) => ipcRenderer.invoke("run-shell-command", command),
  setCliOutputCallback: (cb) => {
    cliOutputCallback = typeof cb === "function" ? cb : null;
  },
});
