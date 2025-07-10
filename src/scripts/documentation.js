const username = "multiverseweb"; // GitHub username
const repo = "malang";         // repository name


fetch('../../variables/last-updated.txt')
  .then(response => response.text())
  .then(date => {
    document.getElementById('last-updated').textContent = "Last Updated: " + date;
  })
  .catch(error => {
    console.error('Error fetching last updated date:', error);
  });

fetch('../../documentation/structure/structure.txt')
  .then(response => response.text())
  .then(structure => {
    document.getElementById('structure').textContent = structure;
  })
  .catch(error => {
    console.error('Error fetching last updated date:', error);
  });

const readmeDiv = document.getElementById("readme-content");

fetch(`https://api.github.com/repos/${username}/${repo}/readme`)
  .then(response => response.json())
  .then(data => {
    if (data.content) {
      const decodedContent = atob(data.content);
      const htmlContent = marked.parse(decodedContent);
      readmeDiv.innerHTML = htmlContent;
    } else {
      readmeDiv.textContent = "Error loading documentation: Protected Source.";
    }
  })
  .catch(error => {
    readmeDiv.textContent = "Error loading README.";
    console.error(error);
  });
