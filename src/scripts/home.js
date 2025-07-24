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
const landingWindow = document.getElementById('landingWindow');
const hues = [0, 90, 180, 270, 360]; // Add more if needed

// Disable default scroll behavior
window.addEventListener('scroll', (e) => {
    if (scrollY < 800) {
        e.preventDefault();
        window.scrollTo(0, 0); // prevent actual scroll
    }
}, { passive: false });

// Custom scroll simulation using wheel event
window.addEventListener('wheel', (e) => {
    if (scrollY < 800) {
        e.preventDefault();
        scrollY += e.deltaY;
        scrollY = Math.max(0, Math.min(scrollY, 800));

        const hueIndex = Math.floor(scrollY / 200);
        const hue = hues[hueIndex] || 0;
        landingWindow.style.filter = `hue-rotate(${hue}deg)`;
    } else {
        landingWindow.style.filter = 'none'; // remove filter after 800px
    }
}, { passive: false });