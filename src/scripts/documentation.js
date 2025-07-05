const username = "multiverseweb"; // Replace with any GitHub username
const repo = "Dataverse";         // Replace with any repository name

const readmeDiv = document.getElementById("readme-content");

fetch(`https://api.github.com/repos/${username}/${repo}/readme`)
  .then(response => response.json())
  .then(data => {
    if (data.content) {
      const decodedContent = atob(data.content);
      const htmlContent = marked.parse(decodedContent);
      readmeDiv.innerHTML = htmlContent;
    } else {
      readmeDiv.textContent = "README not found.";
    }
  })
  .catch(error => {
    readmeDiv.textContent = "Error loading README.";
    console.error(error);
  });
