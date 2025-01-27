const { ipcRenderer } = require("electron");
const { saveGraphQLEndpoints, getGraphQLEndpoints } = require('../main/utils/store.js');
const {graphqlEndpointForQuiz} = getGraphQLEndpoints();

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
    const response = await fetch(graphqlEndpointForQuiz, {
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
      survey.onComplete.add(async (sender) => {
        console.log("Survey Results:", JSON.stringify(sender.data, null, 3));
        await submitQuizResponse(sender.data, quizId);
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

// Function to submit each quiz response
async function submitQuizResponse(answers, quizId) {
  try {
    // Iterate through the survey results and submit each answer
    for (const key of Object.keys(answers)) {
      // Ignore non-question keys like "username" or other metadata
      if (!isNaN(key)) {
        const questionNumber = parseInt(key, 10);
        const answer = answers[key];

        const mutation = `
          mutation {
            createResponse(input: {
              deviceID: "AVC",
              pollID: "${quizId}",
              answer: "${answer}",
              questionNumber: ${questionNumber}
            }) {
              id
            }
          }
        `;

        const response = await fetch(graphqlEndpointForQuiz, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: mutation }),
        });

        const { data } = await response.json();

        if (data && data.createResponse) {
          console.log(`Response for question ${questionNumber} submitted successfully:`, data.createResponse.id);
        } else {
          console.error(`Failed to submit response for question ${questionNumber}.`);
        }
      }
    }

    alert("All quiz responses submitted successfully!");
  } catch (error) {
    console.error("Error submitting quiz responses:", error);
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
