burger = document.getElementById("burger");
header = document.querySelector("header");
burger.addEventListener("click", () => {
    header.classList.toggle("top");
    burger.classList.toggle("top");
});

//when page is scrolled more than 200px toggle class top on header
window.addEventListener("scroll", () => {
    if (window.scrollY > 200) {
        header.classList.remove("top");
        burger.classList.remove("top");
    } else {
        header.classList.add("top");
        burger.classList.add("top");
    }
});

/*

const imageCount = 4;
const track = document.querySelector('.image-track');

for (let i = 1; i <= imageCount; i++) {
    const img = document.createElement('img');
    img.src = `resrc/images/artworks/${i}.jpg`;
    img.alt = `Image ${i}`;
    track.appendChild(img);
}
*/
