const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
const Store = require('electron-store');
const path = require('path');

// Electron Store for persistent settings
const store = new Store();
let mainWindow;

// Unified `createWindow` function
function createWindow() {
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

  mainWindow.loadFile(path.join(__dirname, 'index.html')); // Load the app entry point
  // mainWindow.webContents.openDevTools(); // Open DevTools for debugging

  // Monitor navigation for the main window
  monitorWindowNavigation(mainWindow);

  // Handle popups in the main window
  mainWindow.webContents.setWindowOpenHandler((details) => {
    const newWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'renderer.js'), // Optional renderer preload
        contextIsolation: false,
        nodeIntegration: true,
        webviewTag: true,
      },
    });

    newWindow.loadURL(details.url); // Load the popup's URL
    monitorWindowNavigation(newWindow); // Monitor its navigation

    return { action: 'allow' }; // Allow the popup
  });

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

// Handle settings save via IPC
ipcMain.handle('save-settings', (event, deviceId, computerName) => {
  try {
    store.set('deviceId', deviceId); // Save settings in Electron Store
    store.set('computerName', computerName);
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false };
  }
});

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
ipcMain.handle('getOperatingSystem', () => {
  return process.platform;
});

// App event handling
app.whenReady().then(() => {
  createWindow();

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
      createWindow();
    }
  });
});

// Handle Squirrel startup events on Windows
if (require('electron-squirrel-startup')) {
  app.quit();
}


function openPollWindow() {
  const pollWindow = new BrowserWindow({
    width: 600,
    height: 400,
    parent: mainWindow, // Make the poll window a child of the main window
    modal: true, // Makes the poll window modal (blocks interaction with the main window)
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  pollWindow.loadFile('poll.html'); // Load the poll HTML

  // Open dev tools for debugging (optional)
 // pollWindow.webContents.openDevTools();
}

// Listen for the event to open the poll window
ipcMain.on('open-poll', () => {
  openPollWindow();
});