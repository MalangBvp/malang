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