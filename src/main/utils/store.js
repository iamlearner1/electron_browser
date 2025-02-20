const Store = require('electron-store');
const { machineIdSync } = require('node-machine-id');  // Import the alternative package
const os = require('os');
// checking git repo works
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

// New function to store GraphQL endpoints
function saveComputerDetails(computerNumber) {
  store.set('computer_no', computerNumber);

  console.log('Computer number saved:', {computerNumber});
}

function saveStudentDetails(admission_no) {
  store.set('admission_no', admission_no);
  console.log("student admission number saved : ",{admission_no});
}
// Function to retrieve GraphQL endpoints
function getsavedStudentComputerDetails() {
  const admission_no = store.get('admission_no');
  const computerNumber = store.get('computer_no');

  return { admission_no,computerNumber };
}

// Export functions to use them in other parts of the app
module.exports = { 
  saveDeviceInfo, 
  getDeviceInfo, 
  store, 
  getsavedStudentComputerDetails,  // Export the new function
  saveComputerDetails ,   // Export the function to get the GraphQL endpoints,
  saveStudentDetails
};