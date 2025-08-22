
function searchContent() {
  let input = document.getElementById("searchInput").value.toLowerCase();
  let items = document.querySelectorAll("#contentList li");
  
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(input) ? "" : "none";
  });
}



