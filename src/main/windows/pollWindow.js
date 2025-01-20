const { BrowserWindow } = require('electron');
const path = require('path');

let pollWindow;

// Function to create and open the poll window
function openPollWindow(mainWindow) {
  pollWindow = new BrowserWindow({
    width: 800,
    height: 400,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  pollWindow.loadFile(path.join(__dirname, '../../renderer/poll.html'));

  pollWindow.on('closed', () => {
    pollWindow = null;
  });
}

module.exports = { openPollWindow };  // Export the function properly
