const { ipcRenderer } = require('electron');
const { writeFile } = require('fs');
const { tmpdir } = require('os');
const path = require('path');
const { store } = require('../main/utils/store.js');
const { getsavedStudentComputerDetails} = require('../main/utils/store.js');
const ffmpeg = require('fluent-ffmpeg');
const { saveStudentDetails, saveComputerDetails } = require('../main/utils/store.js');
const { log } = require('console');
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg'); 
let allowedDomains = [];

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
  const examModal = document.getElementById("examModal");
const confirmExamBtn = document.getElementById("confirmExamBtn");
const closeExamModal = document.getElementById("closeExamModal");
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
  // const admission_no = document.getElementById('admissionno').value;
  const computerNumber = document.getElementById('computernumber').value;
 // console.log(admission_no);
  
  // saveStudentComputerDetails(admission_no, computerNumber);
  // saveStudentDetails(admission_no);
  saveComputerDetails(computerNumber)
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
  startTestBtn.disabled = false; 
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
let selectedQuestionID = null; // Variable to store the selected image ID

async function fetchImages() {
  const imageContainer = document.getElementById("image-container");
  const imageTestID = localStorage.getItem("imageTestID"); // Retrieve imageTestID from localStorage

  if (!imageTestID) {
    console.error("No imageTestID found in localStorage.");
    return;
  }

  const query = `
    query {
      getAllImageQuestions(imageTestID: "${imageTestID}") {
        id
        imageUrl
        image_Gif_file
        title
        description
        isUsed
        imageTestID
      }
    }
  `;

  try {
    const response = await axios.post('https://d-erps-sd62fh.pragament.com/graphql', { query });
    let images = response.data.data.getAllImageQuestions;

    // Filter images where isUsed is false
    images = images.filter(image => !image.isUsed);

    // Shuffle images array using Fisher-Yates algorithm
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    // Clear previous content
    imageContainer.innerHTML = "";

    images.forEach(image => {
      const wrapper = document.createElement("div");
      wrapper.style.textAlign = "center";
      wrapper.style.marginBottom = "20px";
      wrapper.classList.add("image-wrapper");

      const imgElement = document.createElement("img");
      imgElement.src = image.imageUrl;
      imgElement.alt = "Image Question";
      imgElement.style.maxWidth = "300px";
      imgElement.style.margin = "10px";
      imgElement.style.cursor = "pointer";
      imgElement.style.borderRadius = "10px";
      imgElement.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.2)";

      const titleElement = document.createElement("h3");
      titleElement.innerText = image.title;
      titleElement.style.margin = "5px 0";

      const modal = document.createElement("div");
      modal.classList.add("modal");
      modal.style.display = "none";
      modal.style.position = "fixed";
      modal.style.top = "50%";
      modal.style.left = "50%";
      modal.style.transform = "translate(-50%, -50%)";
      modal.style.backgroundColor = "#fff";
      modal.style.padding = "20px";
      modal.style.boxShadow = "0px 4px 10px rgba(0, 0, 0, 0.2)";
      modal.style.borderRadius = "10px";
      modal.style.zIndex = "1000";

      const modalTitle = document.createElement("h3");
      modalTitle.innerText = image.title;
      modal.appendChild(modalTitle);

      const modalDescription = document.createElement("p");
      modalDescription.innerText = image.description;
      modal.appendChild(modalDescription);

      const okButton = document.createElement("button");
      okButton.innerText = "OK";
      okButton.style.marginTop = "20px";
      okButton.style.padding = "10px 20px";
      okButton.style.cursor = "pointer";
      okButton.style.backgroundColor = "#4CAF50";
      okButton.style.color = "#fff";
      okButton.style.border = "none";
      okButton.style.borderRadius = "5px";
      okButton.style.fontSize = "16px";

      okButton.addEventListener("click", () => {
        checkIsUsed(image.id, image.imageUrl, image.title,image.description,imageTestID,image.image_Gif_file, wrapper);
        modal.style.display = "none";
      });

      const closeButton = document.createElement("button");
      closeButton.innerText = "Close";
      closeButton.style.marginTop = "20px";
      closeButton.style.padding = "10px 20px";
      closeButton.style.cursor = "pointer";
      closeButton.style.backgroundColor = "#f44336";
      closeButton.style.color = "#fff";
      closeButton.style.border = "none";
      closeButton.style.borderRadius = "5px";
      closeButton.style.fontSize = "16px";

      closeButton.addEventListener("click", () => {
        modal.style.display = "none";
      });

      modal.appendChild(okButton);
      modal.appendChild(closeButton);
      document.body.appendChild(modal);

      imgElement.addEventListener("click", () => {
        modal.style.display = "block";
      });

      wrapper.appendChild(imgElement);
      wrapper.appendChild(titleElement);
      imageContainer.appendChild(wrapper);
    });

    if (images.length > 0) {
      document.getElementById("image-modal").style.display = "flex";
    } else {
      console.log("No unused images available.");
    }
  } catch (error) {
    console.error("Error fetching images:", error);
  }
}


// Function to close the first modal
function closeTestModal() {
    document.getElementById("image-modal").style.display = "none";
}

document.getElementById("close-modal-btn").addEventListener("click", closeTestModal);

async function checkIsUsed(imageID,imageUrl,  title, description, imageTestID,image_Gif_file,wrapper) {
  const { admission_no, computerNumber } = getsavedStudentComputerDetails();

  const query = `
    query {
      checkIsUsed(imageUrl: "${imageUrl}", imageTestID: "${imageTestID}")
    }
  `;

  try {
    const response = await axios.post('https://d-erps-sd62fh.pragament.com/graphql', { query });
    const isUsed = response.data.data.checkIsUsed;
    console.log("isUsed:", isUsed);

    if (isUsed === true) {
      alert("This image is not available. Please select another image.");
      wrapper.remove(); // Removes the entire wrapper (image, title, and description)
    } else {
      console.log("Image is valid:", imageUrl);
      closeTestModal();
      openImageModal(imageUrl,image_Gif_file, title, description);

      // Store the selected image ID
      selectedQuestionID = imageID;
      console.log("Selected Question ID:", selectedQuestionID);

      console.log(imageUrl,imageTestID,admission_no,computerNumber);
      
      // Mutation to update studentId and isUsed status
      const mutation = `
        mutation {
          updateStudentIdAndIsUsed(
            imageUrl: "${imageUrl}",
            imageTestID: "${imageTestID}",
            studentId: "${admission_no}",
            isUsed: true,
            computerNo: "${computerNumber}"
          ) {
            isUsed
          }
        }
      `;

      const mutationResponse = await axios.post('https://d-erps-sd62fh.pragament.com/graphql', { query: mutation });
      console.log("Mutation Response:", mutationResponse.data);

      ipcRenderer.send('load-tinkercad', imageUrl,image_Gif_file);
    }
  } catch (error) {
    console.error("Error checking image usage:", error);
  }
}




// Function to open the second modal with title and description
function openImageModal(imageUrl,image_Gif_file, title, description) {
  document.getElementById("modalTitle").innerText = title;
  document.getElementById("modalImage").src = imageUrl;
  document.getElementById("modal3D").src = image_Gif_file;
  document.getElementById("modalDescription").innerText = description;
  document.getElementById("imageModal").style.display = "block";
}




// Set to capture entire screen directly without dropdown

async function startRecording() {
  const isMacOS = (await ipcRenderer.invoke('get-operating-system')) === 'darwin';
  const audio = !isMacOS
    ? { mandatory: { chromeMediaSource: 'desktop' } }
    : false;

  const constraints = {
    audio,
    video: { mandatory: { chromeMediaSource: 'desktop' } },
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  await videoElement.play();

  // Use H.264 (MP4) for better compatibility & faster loading
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
  mediaRecorder.ondataavailable = onDataAvailable;
  mediaRecorder.onstop = stopRecording;
  mediaRecorder.start();
}

function onDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
}

async function stopRecording() {
  mediaRecorder.stop();
  videoElement.srcObject.getTracks().forEach(track => track.stop()); // Stop the stream

  if (recordedVideo.src) {
    URL.revokeObjectURL(recordedVideo.src);
  }

  // Convert recorded chunks to a Blob
  const blob = new Blob(recordedChunks, { type: 'video/mp4' });

  recordedChunks = []; // Clear memory
  const videoUrl = URL.createObjectURL(blob);

  // Stream video while processing
  recordedVideo.src = videoUrl;
  recordedVideo.preload = "metadata";

  recordedVideo.onloadedmetadata = () => {
    startTimeInput.max = recordedVideo.duration;
    endTimeInput.max = recordedVideo.duration;
  };

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

  // Check for duplicate startTime
  if (trimmedSegments.some(segment => segment.startTime === startTime)) {
    alert("A highlight with the same start time already exists.");
    return;
  }

  trimmedSegments.push({ name: highlightName, startTime, endTime });
  console.log(`Segment saved: ${highlightName} (${startTime} - ${endTime})`);
  alert(`Segment ${trimmedSegments.length} saved!`);

  await createVideoHighlightMutation(highlightName, parseInt(startTime), parseInt(endTime), selectedQuestionID);
};



// Function to call GraphQL mutation
async function createVideoHighlightMutation(name, startTime, endTime,selectedQuestionID) {

const {admission_no ,computerNumber} = getsavedStudentComputerDetails();
  const graphqlEndpoint = 'https://d-erps-sd62fh.pragament.com/graphql';
  const studentID = admission_no;
  
  const mutation = `
    mutation {
      createExamVideoHighlight(
        input: {
          name: "${name}",
          startTime: ${startTime},
          endTime: ${endTime},
          studentID: "${studentID}",
          ImageQuestionID: "${selectedQuestionID}"
        }
      ) {
        id
        name
        startTime
        endTime
        studentID
        ImageQuestionID
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



// startTestBtn.addEventListener("click", async ()=>{
//   startTestBtn.disabled = true; // Disable the button
//   await startRecording();
//   fetchImages();
// });
startTestBtn.addEventListener("click", () => {
  examModal.style.display = "flex"; // Show modal
});

// Close modal when "Cancel" is clicked
closeExamModal.addEventListener("click", () => {
  examModal.style.display = "none";
});

// Start the test after details are entered
// Start the test after details are entered
confirmExamBtn.addEventListener("click", async () => {
  const admissionNumber = document.getElementById("admissionNumber").value.trim();
  const examCode = document.getElementById("examCode").value.trim();

  if (!admissionNumber || !examCode) {
    alert("Please enter both Admission Number and Exam Code.");
    return;
  }

  saveStudentDetails(admissionNumber);

  try {
    const response = await fetch("https://d-erps-sd62fh.pragament.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query {
            validateImageTestInvitationCode(code: "${examCode}") {
              isValid
              imageTestID
            }
          }
        `,
      }),
    });

    const result = await response.json();
    const validationData = result.data?.validateImageTestInvitationCode;

    if (validationData?.isValid) {
      localStorage.setItem("imageTestID", validationData.imageTestID);
      
      // Call mutation to mark the exam code as used
      await fetch("https://d-erps-sd62fh.pragament.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation {
              useImageTestInvitationCode(code: "${examCode}")
            }
          `,
        }),
      });

      examModal.style.display = "none";
      startTestBtn.disabled = true;
      await startRecording();
      fetchImages();
    } else {
      alert("Wrong Exam Code. Please try again.");
    }
  } catch (error) {
    console.error("Error validating exam code:", error);
    alert("An error occurred. Please try again.");
  }
});



// Listen for image event from main process
ipcRenderer.on('display-image', (event, imageUrl,image_Gif_file) => {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalGIF = document.getElementById('modal3D');
  modalGIF.src = image_Gif_file
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

function loadHomePage() {
  const webview = document.getElementById('webview');
  webview.setAttribute('src', 'https://pragament.github.io/electron_browser_home_page/');
}