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
const trimVideoButton = document.getElementById('trimVideoButton');
const closeTrimModal = document.getElementById('closeTrimModal');

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

// Trim video button click event
trimVideoButton.onclick = async () => {
  const startTime = recordedVideo.currentTime; // Capture current video timestamp
  document.getElementById('startTimeDisplay').innerText = startTime.toFixed(2); // Show start time in modal

  const duration = parseInt(document.getElementById('endTimeDropdown').value); // Get selected duration
  const endTime = startTime + duration;

  if (endTime > recordedVideo.duration) {
    alert('End time exceeds video duration.');
    return;
  }

  const { canceled, filePath } = await ipcRenderer.invoke('showSaveDialog');
  if (canceled) return;

  if (filePath) {
    await extractVideoSegment(recordedVideo.src, startTime, endTime, filePath);
    trimVideoModal.style.display = 'none';
  }
};


// Close trim modal button click event
closeTrimModal.onclick = () => {
  trimVideoModal.style.display = 'none';
};

// Extract video segment using fluent-ffmpeg
async function extractVideoSegment(videoUrl, start, end, outputFilePath) {
  // First, convert the blob URL to a buffer
  const response = await fetch(videoUrl);
  const buffer = await response.blob().then(blob => blob.arrayBuffer());

  // Save the buffer as a temporary video file
  const tempFilePath = path.join(tmpdir(), 'temp-video.webm');
  writeFile(tempFilePath, Buffer.from(buffer), (err) => {
    if (err) {
      console.error('Error saving video file:', err);
      return;
    }

    // Now that the video is saved, run ffmpeg to extract the segment
    ffmpeg(tempFilePath)
      .setStartTime(start)
      .setDuration(end - start)
      .output(outputFilePath)
      .on('end', () => {
        console.log('Video extraction completed');
      })
      .on('error', (err) => {
        console.error('Error extracting video segment:', err);
      })
      .run();
  });
}

// document.getElementById('startPollBtn').onclick = () => {
//   ipcRenderer.send('open-poll'); // Open poll window when clicked
// };

// document.getElementById('startQuizBtn').onclick = () => {
//   ipcRenderer.send('open-quiz'); // Open quiz window when clicked
// };


let trimmedSegments = []; // Store trimmed segments
// Save Trim (Stores multiple trimmed parts and calls the mutation)
document.getElementById('saveTrimButton').onclick = async () => {
  const startTime = recordedVideo.currentTime; // Capture current position
  const duration = parseInt(document.getElementById('endTimeDropdown').value);
  const highlightName = document.getElementById('highlightName').value.trim(); // Get highlight name

  const endTime = startTime + duration;
  if (endTime > recordedVideo.duration) {
    alert('End time exceeds video duration.');
    return;
  }

  if (!highlightName) {
    alert("Please enter a highlight name.");
    return;
  }

  console.log(`Saving Trim - Highlight Name: ${highlightName}`);

  const tempSegmentPath = path.join(tmpdir(), `segment_${trimmedSegments.length}.webm`);
  
  await extractVideoSegment(recordedVideo.src, startTime, endTime, tempSegmentPath);
  trimmedSegments.push({ path: tempSegmentPath, name: highlightName });

  console.log('Segment saved:', tempSegmentPath);
  alert(`Segment ${trimmedSegments.length} saved!`);

  // Call the GraphQL mutation to save the trim as a highlight
  await createVideoHighlightMutation(highlightName, parseInt(startTime.toFixed(0)), parseInt(endTime.toFixed(0)));
};

// Function to call GraphQL mutation
async function createVideoHighlightMutation(name, startTime, endTime) {
  const graphqlEndpointForUrls = getGraphQLEndpoints;
  const studentID = graphqlEndpointForUrls; // Hardcoded student ID

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
    const response = await fetch('https://d-erps-sd62fh.pragament.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await response.json();
    console.log('Mutation response:', data);

    if (data.errors) {
      console.error('Error while creating exam video highlight:', data.errors);
    } else {
      console.log('Video highlight created:', data.data.createExamVideoHighlight);
    }
  } catch (error) {
    console.error('Error calling GraphQL API:', error);
  }
}


// Finalize and Merge Video
document.getElementById('finalizeTrimButton').onclick = async () => {
  if (trimmedSegments.length === 0) {
    alert('No trimmed segments to merge.');
    return;
  }

  const { canceled, filePath } = await ipcRenderer.invoke('showSaveDialog');
  if (canceled) return;

  const fullVideoPath = filePath.replace('.webm', '_full.webm'); // Save full video separately

  if (filePath) {
    await mergeVideoSegments(trimmedSegments.map(seg => seg.path), filePath);
    console.log('Final merged video saved at:', filePath);

    // Save full recorded video as well
    const fullVideoBlob = await fetch(recordedVideo.src).then(res => res.blob());
    const buffer = await fullVideoBlob.arrayBuffer();
    writeFile(fullVideoPath, Buffer.from(buffer), (err) => {
      if (err) {
        console.error('Error saving full video:', err);
      } else {
        console.log('Full recorded video saved at:', fullVideoPath);
      }
    });

    alert('Final video and full recorded video saved successfully!');
    trimmedSegments = []; // Reset after saving
    trimVideoModal.style.display = 'none';
  }
};

// Function to merge multiple segments
async function mergeVideoSegments(segmentPaths, outputFilePath) {
  const fileListPath = path.join(tmpdir(), 'segments.txt');

  // Create a file listing all trimmed segments
  const fileContent = segmentPaths.map(p => `file '${p}'`).join('\n');

  return new Promise((resolve, reject) => {
    writeFile(fileListPath, fileContent, (err) => {
      if (err) {
        console.error('Error writing segment list:', err);
        reject(err);
        return;
      }

      console.log('File list created at:', fileListPath);

      // Merge segments using FFmpeg
      ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f concat', '-safe 0']) // Correct way to pass options
        .output(outputFilePath)
        .on('end', () => {
          console.log('Merging completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error merging video:', err);
          reject(err);
        })
        .run();
    });
  });
}


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