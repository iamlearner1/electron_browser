const { ipcRenderer } = require("electron");

// Function to fetch quiz data based on user input
async function fetchQuizData(quizId) {
  const query = `
    query {
      getQuiz(id: "${quizId}") {
    id
    title
    showProgressBar
    showTimer
    timeLimitPerPage
    timeLimit
    firstPageIsStarted
    startSurveyText
    completedHtml
    completedHtmlOnCondition {
      expression
      html
    }
    pages {
      elements {
        type
        html
        name
        titleLocation
        isRequired
        maxLength
        title
        choices
        correctAnswer
        choicesOrder
      }
    }
  }
}

  `;

  try {
    const response = await fetch("http://localhost:5002/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const { data } = await response.json();

    if (data && data.getQuiz) {
      console.log("Quiz Data:", data.getQuiz);

      // Pass the complete response directly to SurveyJS
      const survey = new Survey.Model(data.getQuiz);

      // Handle survey completion
      survey.onComplete.add((sender) => {
        console.log("Survey Results:", JSON.stringify(sender.data, null, 3));
      });

      // Render the survey
      survey.render(document.getElementById("surveyElement"));
    } else {
      console.error("No quiz data found.");
    }
  } catch (error) {
    console.error("Error fetching quiz data:", error);
  }
}

// Event listener for the "Fetch Quiz" button
document.getElementById("fetchQuizBtn").addEventListener("click", () => {
  const quizId = document.getElementById("quizIdInput").value;
  if (quizId) {
    fetchQuizData(quizId);
  } else {
    alert("Please enter a valid Quiz ID.");
  }
});

// Close button event listener
document.getElementById("closeQuizBtn").addEventListener("click", () => {
  console.log("Close button has been clicked.");
  // Uncomment the line below if you want to send a message to the main process
  // ipcRenderer.send('close-quiz');
  window.close();
});
