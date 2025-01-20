const { ipcMain } = require('electron');
const { openPollWindow } = require('./windows/pollWindow');  // Adjust path if necessary
const { openQuizWindow } = require('./windows/quizWindow');

module.exports = {
  setupIPC: (mainWindow) => {
    ipcMain.on('open-poll', () => openPollWindow(mainWindow));
    ipcMain.on('open-quiz', () => openQuizWindow(mainWindow));
    ipcMain.on('close-quiz', () => {
      if (quizWindow) quizWindow.close();
    });
    // ipcMain.on('close-poll',()=>{
    //   if(pollWindow){
    //     pollWindow.close();
    //   }
    // })
    ipcMain.on('close-window', () => {
      if (pollWindow) pollWindow.close();
    });
  },
};
