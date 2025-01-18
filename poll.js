// poll.js

let currentQuestionIndex = 0;
let pollResponses = [];

// Example poll questions
const pollQuestions = [
  { question: "What is your favorite color?", options: ["A. Red", "B. Blue", "C. Green", "D. Yellow"] },
  { question: "What is your favorite animal?", options: ["A. Dog", "B. Cat", "C. Bird", "D. Fish"] },
  // More questions can be added here
];

// Get HTML elements
const pollQuestion = document.getElementById('pollQuestion');
const optionsContainer = document.getElementById('options');
const nextBtn = document.getElementById('nextBtn');
const submitPollBtn = document.getElementById('submitPollBtn');

// Display a question
function displayQuestion() {
  const question = pollQuestions[currentQuestionIndex];
  pollQuestion.textContent = question.question;
  
  optionsContainer.innerHTML = '';
  question.options.forEach(option => {
    optionsContainer.innerHTML += `<label><input type="radio" name="option" value="${option}"> ${option}</label><br>`;
  });
}

// Handle the Next button click
nextBtn.onclick = () => {
  const selectedOption = document.querySelector('input[name="option"]:checked');
  if (!selectedOption) {
    alert("Please select an option before proceeding.");
    return;
  }

  pollResponses.push(selectedOption.value);
  currentQuestionIndex++;

  if (currentQuestionIndex < pollQuestions.length) {
    displayQuestion();
  } else {
    nextBtn.style.display = 'none';
    submitPollBtn.style.display = 'block';
  }
};

// Handle the Submit Poll button click
submitPollBtn.onclick = () => {
  console.log("Poll Responses:", pollResponses);
  // You can send pollResponses to your API here
  alert("Poll submitted! Check the console for responses.");
  window.close(); // Close the poll window after submission
};

// Initialize the poll
displayQuestion();
