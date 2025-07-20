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

// function to install PWA on button click with id "pwa"
document.getElementById("pwa").addEventListener("click", function () {
    alert("PWA will be available soon!");
});

// function to open authentication page on button click with id "account"
document.getElementById("account").addEventListener("click", function () {
    vibrate();
    window.open("/src/pages/login.html", "_self");
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

document.querySelectorAll('[data-include]').forEach(async el => {
    const file = el.getAttribute('data-include');
    const res = await fetch(file);
    el.innerHTML = await res.text();
});

function goBack() {
    window.history.back();
}

async function subscribe() {
    const email = document.getElementById("subscriber-email").value.trim();
    const failureDiv = document.getElementById("failure");
    const subscribeBtn = document.getElementById("subscribe");
    const url = "https://script.google.com/macros/s/AKfycbwCPPqtOOTZfcfJKNK_v422wkJaDiQo2D8FKRH25tvAXB_Rf7sMk_DDKgLFgDScOtOS/exec";


    // ✅ Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        failureDiv.style.opacity = 1;
        failureDiv.textContent = "Please enter a valid email address.";
        setTimeout(() => {
            failureDiv.style.opacity = 0;
        }, 3000);
        return;
    }
    subscribeBtn.textContent = "Subscribing...";
    subscribeBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("mode", "default");

        const response = await fetch(url, { method: "POST", body: formData });
        const text = await response.text();

        if (text.includes("Success")) {
            subscribeBtn.textContent = "Subscribed ✓";
            navigator.vibrate(50);
            subscribeBtn.style.borderColor = "green";
            subscribeBtn.style.color = "green";
            subscribeBtn.style.backgroundColor = "transparent";
            subscribeBtn.disabled = true;
            setTimeout(() => {
                subscribeBtn.textContent = "Subscribe";
                subscribeBtn.style.borderColor = "";
                subscribeBtn.style.color = "";
                subscribeBtn.style.backgroundColor = "";
                subscribeBtn.disabled = false;
            }, 3000);
        } else {
            failureDiv.textContent = text;
            failureDiv.style.opacity = 1;
            setTimeout(() => {
                failureDiv.style.opacity = 0;
            }, 3000);
        }
    } catch (error) {
        console.error(error);
        failureDiv.style.opacity = 1;
        failureDiv.textContent = "Something went wrong.";
        setTimeout(() => {
            failureDiv.style.opacity = 0;
        }, 3000);
    }
    subscribeBtn.disabled = false;
}
