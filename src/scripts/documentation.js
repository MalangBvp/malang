const username = "multiverseweb"; // GitHub username
const repo = "malang";         // repository name

const readmeDiv = document.getElementById("readme-content");

fetch(`https://api.github.com/repos/${username}/${repo}/readme`)
  .then(response => response.json())
  .then(data => {
    if (data.content) {
      const decodedContent = atob(data.content);
      const htmlContent = marked.parse(decodedContent);
      readmeDiv.innerHTML = htmlContent;
    } else {
      readmeDiv.textContent = "Error: Protected Source.";
    }
  })
  .catch(error => {
    readmeDiv.textContent = "Error loading README.";
    console.error(error);
  });
  document.getElementById('loader').style.display = 'none';