console.log("+-----------------+");
console.log("| Tejas' Codes :D |");
console.log("+-----------------+");

document.getElementById('year').textContent = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", function () {
    const burgerButton = document.getElementById("burger");
    const burger = document.querySelector(".burger");
    const nav = document.querySelector("nav");
    const section = document.querySelector("section");
    const navButtons = document.getElementById("nav-buttons");

    function toggleMenu() {
        vibrate();
        const isActive = nav.classList.toggle("active");
        burgerButton.classList.toggle("active");
        section.classList.toggle("active");
        navButtons.classList.toggle("active");

        burger.style.justifyContent = isActive ? "center" : "space-around";
        document.body.style.overflow = isActive ? "hidden" : "scroll";
    }

    burgerButton.addEventListener("click", toggleMenu);
});

// function to invert theme except for elements with class "same" on button click with id "theme"
function applyTheme(toggle = false) {
    const html = document.documentElement;
    const themeButton = document.getElementById("theme");
    const themeIcon = themeButton?.querySelector("img");

    let currentTheme = localStorage.getItem("theme") || "dark";

    if (toggle) {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        localStorage.setItem("theme", currentTheme);
    }
    html.classList.toggle("light", currentTheme === "light");
    document.querySelectorAll(".same").forEach(el => {
        el.style.filter = currentTheme === "light" ? "invert(1)" : "invert(0)";
    });
    if (themeIcon) {
        themeIcon.src = currentTheme === "light"
            ? "/resrc/images/icons/night-mode.png"
            : "/resrc/images/icons/sun.png";
    }
}
window.addEventListener("DOMContentLoaded", () => applyTheme());
document.getElementById("theme").addEventListener("click", () => {
    vibrate();
    applyTheme(true);
});

//function to copy website url to clipboard on button click with id "copy"
document.getElementById("copy").addEventListener("click", function () {
    vibrate();
    navigator.clipboard.writeText("https://malangbvp.github.io/go/to-site").then(() => {
        const themeIcon = this.querySelector("img");
        setTimeout(() => {
            themeIcon.src = "/resrc/images/icons/link.png";
        }
            , 1200);
        themeIcon.src = themeIcon.src.includes("link.png") ? "/resrc/images/icons/tick.png" : "/resrc/images/icons/link.png";
    }).catch(err => {
        console.error("Failed to copy: ", err);
        alert("Failed to copy URL.");
    }
    );
});
//================================================vibration
function vibrate(duration = 50) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
}
//=========================================================

document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll('.slide-in');

    const onScroll = () => {
        const triggerPoint = window.innerHeight - 40;

        elements.forEach(el => {
            const elTop = el.getBoundingClientRect().top;
            if (elTop < triggerPoint) {
                el.classList.add('visible');
            }
        });
    };

    window.addEventListener('scroll', onScroll);
    onScroll(); // trigger once on load
});
