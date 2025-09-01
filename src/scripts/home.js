var i = 0;
var stars = document.getElementById("landingCanvas");
//-----------------------------------------------------------number of stars
for (i = 0; i < 200; i++) {
  let star = document.createElement('div');
  star.classList.add("star");

  let size = Math.random() * 2 + 1;
  //--------------------------------------------------------------------------
  const _width = stars.scrollWidth - 2;
  star.style.top = Math.random() * (stars.scrollHeight + 20) + "px";
  star.style.left = Math.random() * _width + "px";
  star.style.width = size + "px";
  star.style.height = size + "px";
  //--------------------------------------------------------------------------

  let delayValue = Math.random() * 4;

  star.style.animationDelay = delayValue + "s";

  stars.appendChild(star);
}

const masonry = document.getElementById("masonry");
const columns = masonry.querySelectorAll(".masonry-column");

function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 100; // visible threshold
}

window.addEventListener("scroll", () => {
  if (!isInViewport(masonry)) return; // only move when visible

  const rect = masonry.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));

  columns.forEach(col => {
    const speed = parseFloat(col.dataset.speed);
    col.style.transform = `translateY(${progress * 100 * (1 - speed)}px)`;
  });
});

document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-image");
    const closeBtn = document.querySelector(".modal-close");

    // Attach click event to all images inside masonry
    document.querySelectorAll("#masonry img").forEach(img => {
        img.addEventListener("click", function () {
            modal.style.display = "block";
            modalImg.src = this.src;
        });
    });

    // Close modal on clicking X
    closeBtn.addEventListener("click", function () {
        modal.style.display = "none";
    });

    // Close modal on clicking outside content
    modal.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
});