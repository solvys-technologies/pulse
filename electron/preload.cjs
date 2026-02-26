const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  toggleMiniWidget: async () => {
    try {
      await ipcRenderer.invoke("toggle-mini-widget");
    } catch {
      // no-op fallback for renderer calls
    }
  },
});
