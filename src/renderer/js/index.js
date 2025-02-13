const { ipcRenderer } = require('electron');
const { writeFile } = require('fs');
const { tmpdir } = require('os');
const path = require('path');
const { store } = require('../main/utils/store.js');
const { getsavedStudentComputerDetails, saveStudentComputerDetails } = require('../main/utils/store.js');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg'); 
let allowedDomains = [];

const {admission_no ,computerNumber} = getsavedStudentComputerDetails();
// Fetch allowed domains from the GraphQL API
async function fetchAllowedDomains() {
  try {
    const { graphqlEndpointForUrls } = getGraphQLEndpoints();
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
        ) {
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
 // await fetchAllowedDomains(); // Fetch domains on startup

  const searchButton = document.getElementById('search-button');
  const urlInput = document.getElementById('url-input');
  const webview = document.getElementById('webview');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const startTestBtn = document.getElementById("image-modal");
  // When the "Search" button is clicked, validate and load the URL into the webview
  searchButton.addEventListener('click', () => {
    let url = urlInput.value.trim();

    // Ensure the URL starts with 'https://'
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const domain = new URL(url).hostname.toLowerCase();
    webview.src = url;
    // Validate the domain
    // if (allowedDomains.includes(domain)) {
    //   webview.src = url; // Load the URL if it's in the allowed list

    //   // Log the website navigation
    //   logWebsiteNavigation('Navigation', url, domain);
    // } else {
    //   alert('Access to this website is not allowed.');
    // }
  });

  // Log navigation for in-page and other events
  webview.addEventListener('did-navigate', (event) => {
    const domain = new URL(event.url).hostname.toLowerCase();
    // logWebsiteNavigation('Navigation', event.url, domain);
    urlInput.value = event.url;
  });

  webview.addEventListener('did-navigate-in-page', (event) => {
    const domain = new URL(event.url).hostname.toLowerCase();
    // logWebsiteNavigation('In-page Navigation', event.url, domain);
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

  document.getElementById("refresh-button").addEventListener("click", () => {
    const webview = document.getElementById("webview");
    if (webview) {
      webview.reload(); // Refresh the webview
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
  const admission_no = document.getElementById('admissionno').value;
  const computerNumber = document.getElementById('computernumber').value;
  console.log(admission_no);
  
  saveStudentComputerDetails(admission_no, computerNumber);
  console.log(getsavedStudentComputerDetails());
  settingsModal.style.display = 'none';
});

// Screen recording functionality
let mediaRecorder;
let recordedChunks = [];
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const videoSelectBtn = document.getElementById('videoSelectBtn');
const selectMenu = document.getElementById('selectMenu');
const trimVideoModal = document.getElementById('trimVideoModal');
const recordedVideo = document.getElementById('recordedVideo');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
// const trimVideoButton = document.getElementById('trimVideoButton');
const closeTrimModal = document.getElementById('closeTrimModal');

closeTrimModal.onclick = () => {
  const confirmClose = confirm("Are you sure you want to close the Highlight Window click on finalize video ?");
  if (confirmClose) {
    trimVideoModal.style.display = 'none';
  }
};
// Start recording button
// startBtn.onclick = async () => {
//   await startRecording();
//   startBtn.innerText = 'Recording';
// };

// Stop recording button
stopBtn.onclick = () => {
  mediaRecorder.stop();
  // startBtn.innerText = 'Start';
};

// // Populate video sources dropdown
// videoSelectBtn.onclick = async () => {
//   const inputSources = await ipcRenderer.invoke('getSources');
//   inputSources.forEach((source) => {
//     const option = document.createElement('option');
//     option.value = source.id;
//     option.textContent = source.name;
//     selectMenu.appendChild(option);
//   });
// };
async function fetchImages() {
  const imageContainer = document.getElementById("image-container");
  const query = `
    query {
      getAllImageQuestions {
        id
        imageUrl
        title
        description
      }
    }
  `;

  try {
    const response = await axios.post('http://localhost:5002/graphql', { query });
    const images = response.data.data.getAllImageQuestions;

    // Clear previous content
    imageContainer.innerHTML = "";

    images.forEach(image => {
      // Create a wrapper div to group image, title, and description
      const wrapper = document.createElement("div");
      wrapper.style.textAlign = "center";
      wrapper.style.marginBottom = "20px";
      wrapper.classList.add("image-wrapper"); // Add class for easier removal later

      // Create image element
      const imgElement = document.createElement("img");
      imgElement.src = image.imageUrl;
      imgElement.alt = "Image Question";
      imgElement.style.maxWidth = "300px";
      imgElement.style.margin = "10px";

      // Create title element
      const titleElement = document.createElement("h3");
      titleElement.innerText = image.title;
      titleElement.style.margin = "5px 0";

      // Create description element
      const descElement = document.createElement("p");
      descElement.innerText = image.description;
      descElement.style.fontSize = "14px";
      descElement.style.color = "gray";

      // Append elements to the wrapper
      wrapper.appendChild(imgElement);
      wrapper.appendChild(titleElement);
      wrapper.appendChild(descElement);

      // Add event listener
      imgElement.addEventListener("click", () => checkIsUsed(image.imageUrl, image.title, image.description, wrapper));

      // Append wrapper to container
      imageContainer.appendChild(wrapper);
    });

    // Show modal
    document.getElementById("image-modal").style.display = "flex";

  } catch (error) {
    console.error("Error fetching images:", error);
  }
}



// Function to close the first modal
function closeTestModal() {
    document.getElementById("image-modal").style.display = "none";
}

document.getElementById("close-modal-btn").addEventListener("click", closeTestModal);
async function checkIsUsed(imageUrl, title, description, wrapper, computerNo) {
  const query = `
    query {
      checkIsUsed(imageUrl: "${imageUrl}")
    }
  `;

  try {
    const response = await axios.post('http://localhost:5002/graphql', { query });
    const isUsed = response.data.data.checkIsUsed;
    console.log("isUsed:", isUsed);

    if (isUsed === true) {
      alert("This image is not available. Please select another image.");
      wrapper.remove(); // Removes the entire wrapper (image, title, and description)
    } else {
      console.log("Image is valid:", imageUrl);
      closeTestModal();
      openImageModal(imageUrl, title, description);

      // Mutation to update studentId and isUsed status
      const mutation = `
        mutation {
          updateStudentIdAndIsUsed(
            imageUrl: "${imageUrl}",
            studentId: "${admission_no}",
            isUsed: true,
            computerNo: "${computerNumber}"
          ) {
            isUsed
          }
        }
      `;

      const mutationResponse = await axios.post('http://localhost:5002/graphql', { query: mutation });
      console.log("Mutation Response:", mutationResponse.data);

      ipcRenderer.send('load-tinkercad', imageUrl);
    }
  } catch (error) {
    console.error("Error checking image usage:", error);
  }
}



// Function to open the second modal with title and description
function openImageModal(imageUrl, title, description) {
  document.getElementById("modalTitle").innerText = title;
  document.getElementById("modalImage").src = imageUrl;
  document.getElementById("modalDescription").innerText = description;
  document.getElementById("imageModal").style.display = "block";
}




// Set to capture entire screen directly without dropdown
async function startRecording() {
  // AUDIO WON'T WORK ON MACOS
  const isMacOS = (await ipcRenderer.invoke('get-operating-system')) === 'darwin';
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
        chromeMediaSource: 'desktop', // Capture entire screen
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
  recordedChunks = [];

  // Create a URL for the recorded video
  const videoUrl = URL.createObjectURL(blob);
  recordedVideo.src = videoUrl;

  // Set max values for start and end time inputs
  recordedVideo.addEventListener('loadedmetadata', () => {
    const duration = recordedVideo.duration;
    startTimeInput.max = duration;
    endTimeInput.max = duration;
  });

  // Show the trim video modal
  trimVideoModal.style.display = 'block';
}

let trimmedSegments = [];

// Save Trim (Stores trim details without extracting video)
document.getElementById('saveTrimButton').onclick = async () => {
  const startTime = recordedVideo.currentTime.toFixed(2);
  const duration = parseInt(document.getElementById('endTimeDropdown').value);
  const highlightName = document.getElementById('highlightNameDropdown').value; // Get value from dropdown

  const endTime = (parseFloat(startTime) + duration).toFixed(2);
  
  if (endTime > recordedVideo.duration) {
    alert('End time exceeds video duration.');
    return;
  }

  if (!highlightName) {
    alert("Please select a highlight name.");
    return;
  }

  trimmedSegments.push({ name: highlightName, startTime, endTime });
  console.log(`Segment saved: ${highlightName} (${startTime} - ${endTime})`);
  alert(`Segment ${trimmedSegments.length} saved!`);

  await createVideoHighlightMutation(highlightName, parseInt(startTime), parseInt(endTime));
};


// Function to call GraphQL mutation
async function createVideoHighlightMutation(name, startTime, endTime) {
  const graphqlEndpoint = 'http://localhost:5002/graphql';
  const studentID = admission_no;
  
  const mutation = `
    mutation {
      createExamVideoHighlight(
        input: {
          name: "${name}",
          startTime: ${startTime},
          endTime: ${endTime},
          studentID: "${studentID}"
        }
      ) {
        id
        name
        startTime
        endTime
        studentID
      }
    }
  `;

  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await response.json();
    console.log('Mutation response:', data);
  } catch (error) {
    console.error('Error calling GraphQL API:', error);
  }
}

// Finalize and Save Video
document.getElementById('finalizeTrimButton').onclick = async () => {
  if (trimmedSegments.length === 0) {
    alert('No highlights saved.');
    return;
  }

  const { canceled, filePath } = await ipcRenderer.invoke('showSaveDialog');
  if (canceled) return;
  
  const fullVideoBlob = await fetch(recordedVideo.src).then(res => res.blob());
  const buffer = await fullVideoBlob.arrayBuffer();

  writeFile(filePath, Buffer.from(buffer), (err) => {
    if (err) {
      console.error('Error saving full video:', err);
    } else {
      console.log('Full recorded video saved at:', filePath);
      alert('Full video saved successfully!');
    }
  });

  trimmedSegments = [];
  trimVideoModal.style.display = 'none';
};



startTestBtn.addEventListener("click", async ()=>{
  await startRecording();
  fetchImages();
});


// Listen for image event from main process
ipcRenderer.on('display-image', (event, imageUrl) => {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');

  modalImage.src = imageUrl; // Set image source
  modal.style.display = "block"; // Show modal
});

const showImage = document.getElementById('show-Image');

// Show image when clicking the button
showImage.addEventListener('click', () => {
  ipcRenderer.send('request-image'); // Request image from main process
});

// Close modal when clicking outside
window.onclick = (event) => {
  const modal = document.getElementById('imageModal');
  if (event.target === modal) {
    modal.style.display = "none";
  }
};