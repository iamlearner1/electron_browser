const { contextBridge, ipcRenderer } = require('electron');
const { paths } = require('ffmpeg-static-electron-forge');

contextBridge.exposeInMainWorld('api', {
  ffmpegPath: paths.ffmpegPath,
  ffprobePath: paths.ffprobePath,
});