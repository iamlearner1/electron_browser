const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.on('update-webview', (event, url) => {
    const webview = document.getElementById('webview');
    if (webview) {
      webview.src = url; // Update webview source
    }
  });
});
