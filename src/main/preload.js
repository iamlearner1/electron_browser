const { ipcRenderer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    closeQuiz: () => ipcRenderer.send("close-quiz"), // Expose the function
});
