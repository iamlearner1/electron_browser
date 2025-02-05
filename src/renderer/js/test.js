const { ipcRenderer } = require('electron');
const fetch = require('node-fetch');

// GraphQL endpoint
const graphqlEndpoint = "http://localhost:5002/graphql";

// Fetch all image questions
async function fetchImageQuestions() {
  const query = `
    query {
      getAllImageQuestions {
        id
        imageUrl
      }
    }
  `;

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  return result.data.getAllImageQuestions;
}

// Check if the image is already used
async function checkIfImageIsUsed(imageUrl) {
  const query = `
    query {
      checkIsUsed(imageUrl: "${imageUrl}") {
        isUsed
      }
    }
  `;

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  return result.data.checkIsUsed.isUsed;
}

// Update the image use status
async function updateImageStatus(imageUrl) {
  const mutation = `
    mutation {
      updateStudentIdAndIsUsed(imageUrl: "${imageUrl}", isUsed: true, studentId: "4546") {
        id
        studentId
        imageUrl
        isUsed
      }
    }
  `;

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation }),
  });

  const result = await response.json();
  return result.data.updateStudentIdAndIsUsed;
}

// Render images in grid
async function renderImages() {
  const imageQuestions = await fetchImageQuestions();
  const imageGrid = document.getElementById('imageGrid');

  imageQuestions.forEach((image) => {
    const imageItem = document.createElement('div');
    imageItem.classList.add('imageItem');
    imageItem.innerHTML = `<img src="${image.imageUrl}" alt="Image" data-url="${image.imageUrl}" />`;
    imageItem.addEventListener('click', async () => {
      const isUsed = await checkIfImageIsUsed(image.imageUrl);
      if (isUsed) {
        alert("This image has already been assigned. Please choose another one.");
      } else {
        window.open("http://tinkercad.com", "_blank");
        await updateImageStatus(image.imageUrl);
      }
    });
    imageGrid.appendChild(imageItem);
  });
}

// Show assigned image
document.getElementById('assignedImageBtn').addEventListener('click', () => {
  const assignedImage = document.getElementById('assignedImage');
  const img = assignedImage.querySelector('img');
  img.src = "https://example.com/assigned-image.jpg"; // Replace with the actual assigned image URL
  assignedImage.style.display = 'block';
});

// Close the test window
document.getElementById('closeQuizBtn').addEventListener('click', () => {
  window.close();
});

// Initialize the page by rendering images
renderImages();
