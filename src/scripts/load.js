console.log("+-----------------+");
console.log("| Tejas' Codes :D |");
console.log("+-----------------+");

const content = document.getElementById("content");
var init = true;

// move toggleMenu outside
function toggleMenu() {
    const nav = document.querySelector("#nav");
    const burgerButton = document.getElementById("burger");
    const burger = document.querySelector(".burger");

    const isActive = nav.classList.toggle("active");
    burgerButton.classList.toggle("active");
    //section.classList.toggle("active");
    burger.style.justifyContent = isActive ? "center" : "space-around";
    document.body.style.overflow = isActive ? "hidden" : "scroll";
}

setTimeout(() => {
    document.getElementById('year').textContent = new Date().getFullYear();
    const burgerButton = document.getElementById("burger");

    burgerButton.addEventListener("click", toggleMenu);

    document.getElementById("theme").addEventListener("click", () => {
        vibrate();
        applyTheme(true);
    });

    document.getElementById("pwa").addEventListener("click", function () {
        showAlert("PWA Installation", "Install our app for faster access, offline support and a smoother experience.", "Install");
    });

    document.getElementById("copy").addEventListener("click", function () {
        vibrate();
        navigator.clipboard.writeText("https://malangbvp.github.io/go/to-site").then(() => {
            const themeIcon = this.querySelector("img");
            setTimeout(() => {
                themeIcon.src = "/resrc/images/icons/link.webp";
            }, 1200);
            themeIcon.src = themeIcon.src.includes("link.webp") ? "/resrc/images/icons/tick.webp" : "/resrc/images/icons/link.webp";
        }).catch(err => {
            console.error("Failed to copy: ", err);
            alert("Failed to copy URL.");
        });
    });

    burgerButton.classList.remove('loading');
    loadPage("/home.html");
}, 1000);

function loadPage(url) {
    content.src = url;
    if (!init && !["/src/pages/account.html", "home.html"].includes(url)) {
        toggleMenu();
    }
    init = false;
}
