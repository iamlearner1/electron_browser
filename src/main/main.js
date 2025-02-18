const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { setupIPC } = require('./ipcHandlers'); // Import IPC handler setup
const { saveDeviceInfo, getDeviceInfo } = require('./utils/store');
const FFmpegStatic = require('ffmpeg-static-electron-forge').default;
const { openTestWindow } = require('./windows/testWindow');
// Electron Store for persistent settings
const store = new Store();
let mainWindow;

// Function to create the main window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Direct path to preload script
      contextIsolation: false,
      nodeIntegration: true,
      webviewTag: true, // Enable webview
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')); // Correct path to the index.html file

  // Setup IPC communication
  setupIPC(mainWindow);

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Monitor navigation in any BrowserWindow
function monitorWindowNavigation(window) {
  const webContents = window.webContents;

  webContents.on('did-navigate', (event, url) => {
    console.log('Navigated to:', url); // Log full page navigation
  });

  webContents.on('did-navigate-in-page', (event, url) => {
    console.log('In-page navigation to:', url); // Log in-page navigation
  });
}

// Handle screen recording sources via IPC
ipcMain.handle('getSources', async () => {
  return await desktopCapturer.getSources({ types: ['window', 'screen'] });
});

// Handle save dialog via IPC
ipcMain.handle('showSaveDialog', async () => {
  return await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`,
  });
});

// Get the operating system
ipcMain.handle('get-operating-system', () => {
  return process.platform;
});

// Provide FFmpeg paths via IPC
ipcMain.handle('get-ffmpeg-path', () => {
  return FFmpegStatic.paths.ffmpegPath;
});

// App event handling
app.whenReady().then(() => {
  saveDeviceInfo();  // Save device info to store
  const deviceInfo = getDeviceInfo(); // Retrieve saved device info
  createMainWindow(); // Create the main window
  // Monitor any newly created windows
  app.on('browser-window-created', (event, newWindow) => {
    monitorWindowNavigation(newWindow);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Listen for the request to get deviceID
ipcMain.handle('get-device-id', () => {
  return getDeviceInfo();  // Retrieve the device ID from the store
});

// Handle Squirrel startup events on Windows
if (require('electron-squirrel-startup')) {
  app.quit();
}
ipcMain.on('open-test-window', (event, { imageUrl }) => {
  openTestWindow(event.sender); // Open the test window, passing the sender (mainWindow)
});


let storedImageUrl = ""; // Declare the variable globally

ipcMain.on('load-tinkercad', (event, imageUrl) => {
  storedImageUrl = imageUrl; // Store the image URL
 // mainWindow.webContents.send('update-webview', 'https://www.tinkercad.com/joinclass/HTGPACXK4');
});

ipcMain.on('request-image', (event) => {
  event.sender.send('display-image', storedImageUrl);
});