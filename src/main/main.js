const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { setupIPC } = require('./ipcHandlers'); // Import IPC handler setup
const {openPollWindow} = require("./windows/pollWindow")
const {openQuizWindow} = require("./windows/quizWindow")

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

// Listen for the event to open the poll window
ipcMain.on('open-poll', () => {
  openPollWindow(mainWindow); // Open poll window
});

// Listen for the event to open the quiz window
ipcMain.on('open-quiz', () => {
  openQuizWindow(mainWindow); // Open quiz window
});

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
ipcMain.handle('getOperatingSystem', () => {
  return process.platform;
});

// App event handling
app.whenReady().then(() => {
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

// Handle Squirrel startup events on Windows
if (require('electron-squirrel-startup')) {
  app.quit();
}
