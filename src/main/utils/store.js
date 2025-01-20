// util/store.js

const Store = require('electron-store');
const { machineIdSync } = require('node-machine-id');  // Import the alternative package
const os = require('os');

// Create a new instance of electron-store
const store = new Store();

// Function to get and save device info
function saveDeviceInfo() {
  const deviceID = machineIdSync();  // Get device ID using node-machine-id package
  const computerName = os.hostname(); // Get computer name using os module

  // Save to electron-store
  store.set('deviceID', deviceID);
  store.set('computerName', computerName);

 // console.log('Device info saved:', { deviceID, computerName });
}

// Function to retrieve device info
function getDeviceInfo() {
  const deviceID = store.get('deviceID');
  const computerName = store.get('computerName');

  return { deviceID, computerName };
}

// Export functions to use them in other parts of the app
module.exports = { saveDeviceInfo, getDeviceInfo };
