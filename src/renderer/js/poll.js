const { ipcRenderer } = require('electron');
const { saveGraphQLEndpoints, getGraphQLEndpoints } = require('../main/utils/store.js');
let currentQuestionIndex = 1;  // Start from question number 1
let pollResponses = [];
let totalQuestions = 3;  // Default value, will be updated after OTP verification
let pollID = null;  // Store the poll ID after OTP validation
const {graphqlEndpointForQuiz} = getGraphQLEndpoints();

// Get HTML elements
const otpInput = document.getElementById('otpInput');
const startPollBtn = document.getElementById('startPollBtn');
const pollQuestion = document.getElementById('pollQuestion');
const optionsContainer = document.getElementById('options');
const nextBtn = document.getElementById('nextBtn');
const submitPollBtn = document.getElementById('submitPollBtn');
const pollQuestionContainer = document.getElementById('pollQuestionContainer');
const otpContainer = document.getElementById('otpContainer');
const closeBtn = document.getElementById('closeBtn');

// Initially enable the close button
closeBtn.disabled = false;

// Function to display the poll question
function displayQuestion() {
  const question = { question: "Please select your choice of option", options: ["A", "B", "C", "D"] };
  
  pollQuestion.textContent = `Question ${currentQuestionIndex}: ${question.question}`;
  optionsContainer.innerHTML = '';
  question.options.forEach(option => {
    optionsContainer.innerHTML += `<label><input type="radio" name="option" value="${option}"> ${option}</label><br>`;
  });
}

// Function to start the poll after OTP validation
async function startPoll() {
  const otp = otpInput.value;

  if (otp.length !== 6 || isNaN(otp)) {
    alert("Please enter a valid 6-digit OTP.");
    return;
  }

  // Disable the close button after poll starts
  closeBtn.disabled = true;
 
  // GraphQL query to get poll ID
  const response = await fetch(graphqlEndpointForQuiz, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query {
        getPollIDByOTP(otp: "${otp}")
      }`
    })
  });
  const data = await response.json();

  if (data.data.getPollIDByOTP) {
    pollID = data.data.getPollIDByOTP;

    // Fetch the number of questions
    const numQuestionsResponse = await fetch(graphqlEndpointForQuiz, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query {
          getPoll(id: "${pollID}") {
            numQuestions
          }
        }`
      })
    });
    const numQuestionsData = await numQuestionsResponse.json();
    totalQuestions = numQuestionsData.data.getPoll.numQuestions;

    // Hide OTP container and show the poll
    otpContainer.style.display = 'none';
    pollQuestionContainer.style.display = 'block';

    displayQuestion();
  } else {
    alert("Invalid OTP. Please try again.");
  }
}

// Handle the Start Poll button click
startPollBtn.onclick = startPoll;

// Handle the Next button click
nextBtn.onclick = async () => {
  const selectedOption = document.querySelector('input[name="option"]:checked');
  if (!selectedOption) {
    alert("Please select an option before proceeding.");
    return;
  }

  pollResponses.push(selectedOption.value);

  // Get the deviceID from the main process using IPC
  const deviceInfo = await ipcRenderer.invoke('get-device-id');
  const deviceID = deviceInfo.deviceID;  // Extract the deviceID


  // Mutation to submit the response
  const response = await fetch(graphqlEndpointForQuiz, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation {
        createResponse(input: {
          deviceID: "${deviceID}",
          answer: "${selectedOption.value}",
          questionNumber: ${currentQuestionIndex},
          pollID: "${pollID}"
        }) {
          id
        }
      }`
    })
  });

  const mutationData = await response.json();
  console.log("Response submitted:", mutationData);

  currentQuestionIndex++;

  if (currentQuestionIndex <= totalQuestions) {
    displayQuestion();
  } else {
    nextBtn.style.display = 'none';
    submitPollBtn.style.display = 'block';
    closeBtn.disabled = false; // Enable the close button after poll is submitted
  }
};

// Handle the Submit Poll button click
submitPollBtn.onclick = () => {
  console.log("Poll Responses:", pollResponses);
  // You can send pollResponses to your API here
  alert("Poll submitted! Check the console for responses.");
  window.close();
  closeBtn.disabled = false; // Ensure close button is enabled after submission
};

// Handle the Close button click
closeBtn.onclick = () => {
  window.close();
};
