document.addEventListener("DOMContentLoaded", function () {
    const burgerButton = document.getElementById("burger");
    const burger = document.querySelector(".burger");
    const nav = document.querySelector("nav");

    burgerButton.addEventListener("click", function () {
        vibrate();
        nav.classList.toggle("active");
        burgerButton.classList.toggle("active");
        document.getElementsByTagName("section").item(0).classList.toggle("active");
        document.getElementById("nav-buttons").classList.toggle("active");

        const currentStyle = getComputedStyle(burger).justifyContent;

        if (currentStyle === "center") {
            burger.style.justifyContent = "space-around";
            document.body.style.overflow = "scroll"; // Restore scrolling when menu is closed

        } else {
            burger.style.justifyContent = "center";
            document.body.style.overflow = "hidden";
        }
    });
});

// function to invert theme except for elements with class "same" on button click with id "theme"
document.getElementById("theme").addEventListener("click", function () {
    vibrate();
    /*const elements = document.querySelectorAll(".same");
    document.body.style.filter = "invert(1)";
    elements.forEach(el => {
        el.style.filter = document.body.classList.contains("dark") ? "invert(1)" : "none";
    });*/

    const themeIcon = this.querySelector("img");
    themeIcon.src = themeIcon.src.includes("sun.png") ? "/resrc/images/icons/night-mode.png" : "/resrc/images/icons/sun.png";
});

//function to copy website url to clipboard on button click with id "copy"
document.getElementById("copy").addEventListener("click", function () {
    vibrate();
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
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
