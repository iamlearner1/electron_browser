const { ipcRenderer } = require('electron');
const { writeFile } = require('fs');
const { store } = require('../main/utils/store.js');
const { saveGraphQLEndpoints, getGraphQLEndpoints } = require('../main/utils/store.js');

let allowedDomains = [];

// Fetch allowed domains from the GraphQL API
async function fetchAllowedDomains() {
  try {
    const {graphqlEndpointForUrls} = getGraphQLEndpoints();
    const response = await fetch(graphqlEndpointForUrls, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            getAllWebsiteLists {
              domain
            }
          }
        `,
      }),
    });

    const result = await response.json();
    allowedDomains = result.data.getAllWebsiteLists.map((item) => item.domain.trim().toLowerCase());
    console.log('Allowed domains:', allowedDomains);
  } catch (error) {
    console.error('Error fetching allowed domains:', error);
  }
}

// Function to log website navigation

async function logWebsiteNavigation(category, pageUrl, domain) {
  try {
    // Get device ID using ipcRenderer to communicate with the main process
    const deviceID = "6792056132ec51cc682947fa";
    
    const mutation = `
      mutation {
        createWebsiteUsageLogOrList(
          category: "${category}",
          page_url: "${pageUrl}",
          device_id: "${deviceID}",
          domain: "${domain}"
        ){
          
        _id
        }
      }
    `;

    const response = await fetch('http://localhost:5008/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    });

    const result = await response.json();
    console.log('Website usage logged:', result);
  } catch (error) {
    console.error('Error logging website usage:', error);
  }
}
// Webview controls
window.addEventListener('DOMContentLoaded', async () => {
  await fetchAllowedDomains(); // Fetch domains on startup

  const searchButton = document.getElementById('search-button');
  const urlInput = document.getElementById('url-input');
  const webview = document.getElementById('webview');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');

  // When the "Search" button is clicked, validate and load the URL into the webview
  searchButton.addEventListener('click', () => {
    let url = urlInput.value.trim();

    // Ensure the URL starts with 'https://'
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const domain = new URL(url).hostname.toLowerCase();

    // Validate the domain
    if (allowedDomains.includes(domain)) {
      webview.src = url; // Load the URL if it's in the allowed list

      // Log the website navigation
      logWebsiteNavigation('Navigation', url, domain);
    } else {
      alert('Access to this website is not allowed.');
    }
  });

  // Log navigation for in-page and other events
  webview.addEventListener('did-navigate', (event) => {
    const domain = new URL(event.url).hostname.toLowerCase();
    logWebsiteNavigation('Navigation', event.url, domain);
    urlInput.value = event.url;
  });

  webview.addEventListener('did-navigate-in-page', (event) => {
    const domain = new URL(event.url).hostname.toLowerCase();
    logWebsiteNavigation('In-page Navigation', event.url, domain);
    urlInput.value = event.url;
  });

  prevButton.addEventListener('click', () => {
    if (webview.canGoBack()) {
      webview.goBack();
    }
  });

  nextButton.addEventListener('click', () => {
    if (webview.canGoForward()) {
      webview.goForward();
    }
  });
});


// Settings modal controls
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsButton = document.getElementById('closeSettings');
const saveSettingsButton = document.getElementById('saveSettings');

// Open the settings modal when the button is clicked
settingsButton.addEventListener('click', () => {
  settingsModal.style.display = 'block';
});

// Close the settings modal
closeSettingsButton.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// Save settings and send data to the main process
saveSettingsButton.addEventListener('click', async () => {
  const deviceId = document.getElementById('deviceId').value;
  const computerName = document.getElementById('computerName').value;
  saveGraphQLEndpoints(deviceId,computerName);
  console.log(getGraphQLEndpoints());
  settingsModal.style.display = 'none'; 
  // Send the settings data to the main process to save using Electron Store
 //  const response = await ipcRenderer.invoke('save-settings', deviceId, computerName);

  // if (response.success) {
  //   console.log('Settings saved successfully!');
  //   settingsModal.style.display = 'none'; // Close modal after saving
  // } else {
  //   console.error('Failed to save settings.');
  // }
});

// Screen recording functionality
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const videoSelectBtn = document.getElementById('videoSelectBtn');
const selectMenu = document.getElementById('selectMenu');

// Start recording button
startBtn.onclick = async () => {
  await startRecording();
  startBtn.innerText = 'Recording';
};

// Stop recording button
stopBtn.onclick = () => {
  mediaRecorder.stop();
  startBtn.innerText = 'Start';
};

// Populate video sources dropdown
videoSelectBtn.onclick = async () => {
  const inputSources = await ipcRenderer.invoke('getSources');
  inputSources.forEach((source) => {
    const option = document.createElement('option');
    option.value = source.id;
    option.textContent = source.name;
    selectMenu.appendChild(option);
  });
};

// Start recording function
async function startRecording() {
  const screenId = selectMenu.options[selectMenu.selectedIndex].value;

  // AUDIO WON'T WORK ON MACOS
  const isMacOS = (await ipcRenderer.invoke('getOperatingSystem')) === 'darwin';
  const audio = !isMacOS
    ? {
        mandatory: {
          chromeMediaSource: 'desktop',
        },
      }
    : false;

  const constraints = {
    audio,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: screenId,
      },
    },
  };

  // Create a stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  await videoElement.play();

  // Start media recording
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
  mediaRecorder.ondataavailable = onDataAvailable;
  mediaRecorder.onstop = stopRecording;
  mediaRecorder.start();
}

// Data available handler
function onDataAvailable(event) {
  recordedChunks.push(event.data);
}

// Stop recording handler
async function stopRecording() {
  videoElement.srcObject = null;

  const blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9',
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  recordedChunks = [];

  const { canceled, filePath } = await ipcRenderer.invoke('showSaveDialog');
  if (canceled) return;

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('Video saved successfully!'));
  }
}

    
document.getElementById('startPollBtn').onclick = () => {
  ipcRenderer.send('open-poll'); // Open poll window when clicked
};


    
document.getElementById('startQuizBtn').onclick = () => {
  ipcRenderer.send('open-quiz'); // Open poll window when clicked
};