const { BrowserWindow } = require('electron');
const path = require('path');

let testWindow;

// Function to create and open the test window
function openTestWindow(mainWindow) {
  testWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  testWindow.loadFile(path.join(__dirname, '../../renderer/test.html'));

  testWindow.on('closed', () => {
    testWindow = null;
  });
}

module.exports = { openTestWindow };
