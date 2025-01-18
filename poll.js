let currentQuestionIndex = 1;  // Start from question number 1
let pollResponses = [];

// Set the number of questions to 3 (hardcoded for now)
let totalQuestions = 3;

// The same question for all iterations
const pollQuestionTemplate = { question: "Please select your choice of option", options: ["A", "B", "C", "D"] };

// Get HTML elements
const pollQuestion = document.getElementById('pollQuestion');
const optionsContainer = document.getElementById('options');
const nextBtn = document.getElementById('nextBtn');
const submitPollBtn = document.getElementById('submitPollBtn');

// Display the question based on the current index
function displayQuestion() {
  const question = pollQuestionTemplate;  // Use the same question for all iterations

  // Update question number
  pollQuestion.textContent = `Question ${currentQuestionIndex}: ${question.question}`;
  
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

  if (currentQuestionIndex <= totalQuestions) {
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
document.getElementById('pollQuestionContainer').style.display = 'block';  // Show the poll container
displayQuestion();
