const { BrowserWindow } = require('electron');
const path = require('path');

let quizWindow;

// Function to create and open the quiz window
function openQuizWindow(mainWindow) {
  quizWindow = new BrowserWindow({
    width: 800,
    height: 400,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  quizWindow.loadFile(path.join(__dirname, '../../renderer/quiz.html'));

  quizWindow.on('closed', () => {
    quizWindow = null;
  });
}

module.exports = { openQuizWindow };  // Ensure this export is correct
