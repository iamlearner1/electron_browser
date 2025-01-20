const { ipcRenderer } = require("electron");

const survey = new Survey.Model(json);
survey.onComplete.add((sender, options) => {
    console.log(JSON.stringify(sender.data, null, 3));
});
survey.render(document.getElementById("surveyElement"));

document.getElementById("closeQuizBtn").addEventListener('click',()=>{

    console.log("closed button as been clicked");
    ipcRenderer.sender('close-quiz');
})
