const content = document.getElementById("content");

function loadPage(url) {
    content.src = url;

    content.onload = () => {
        try {
            content.style.height = content.contentWindow.document.body.scrollHeight + "px";
        } catch (e) {
            console.warn("Cross-origin content, cannot auto-resize.");
        }
    };
}

document.addEventListener("DOMContentLoaded", () => {
    loadPage("/404.html");  // same-origin page will resize correctly
});