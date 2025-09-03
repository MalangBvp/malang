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

const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-image");
const closeModal = document.querySelector(".modal-close");

masonry.addEventListener("click", (e) => {
  const target = e.target;
  if (target.tagName === "IMG") {
    document.querySelector("section").classList.add("modal-active");
    const fileName = target.src.split("/").pop();

    modalImg.src = target.src;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
});

closeModal.addEventListener("click", () => {
  document.querySelector("section").classList.remove("modal-active");
  modal.style.display = "none";
  document.body.style.overflow = "scroll";
});
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    document.querySelector("section").classList.remove("modal-active");
    modal.style.display = "none";
    document.body.style.overflow = "scroll";
  }
});

function scrollToBottom() {
  window.scrollTo({
    top: document.body.scrollHeight
  });
}

const loader = document.getElementById("loader");
document.fonts.load("1em " + getComputedStyle(kalakaar).fontFamily).then(() => {
  loader.style.opacity = "0";
  setTimeout(() => loader.style.display = "none", 500);
});