// Function to include HTML files dynamically on priority

document.addEventListener('DOMContentLoaded', async () => {
    // Load all other includes without blocking
    document.querySelectorAll('[data-include]').forEach(async el => {
        if (el.getAttribute('data-include') !== "nav.html") {
            const file = el.getAttribute('data-include');
            const res = await fetch(file);
            el.innerHTML = await res.text();
        }
    });
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
            ? "/resrc/images/icons/night-mode.webp"
            : "/resrc/images/icons/sun.webp";
    }
}

function toggleRestricted() {
    const isLoggedIn = localStorage.getItem("loggedIn") === "true";

    document.querySelectorAll(".restricted").forEach(el => {
        el.style.display = isLoggedIn ? "block" : "none";
    });

    document.querySelectorAll(".protected").forEach(el => {
        el.style.display = isLoggedIn ? "none" : "flex";
    });

    const accountLogin = document.getElementById("loginForm");
    if (accountLogin) {
        document.getElementById("loginBtn").style.display = isLoggedIn ? "none" : "inline-block";
        document.getElementById("logoutBtn").style.display = isLoggedIn ? "inline-block" : "none";
    }
}


//=======================================================================common button behavior
function handleButtonAction(buttonId, loaderText, successText, taskFunction, errorText = "Failed") {
    const button = document.getElementById(buttonId);
    if (!button || typeof taskFunction !== 'function') return;

    const originalText = button.innerHTML;
    button.disabled = true;
    button.style.borderColor = 'gold';
    button.style.color = 'gold';
    button.innerHTML = `<img src="/resrc/images/icons/loading.gif" style="height: 15px; margin-bottom: -2px; filter: brightness(0) invert(1)"> ${loaderText}...`;

    Promise.resolve()
        .then(taskFunction)
        .then(() => {
            button.style.borderColor = 'green';
            button.style.color = 'green';
            button.innerHTML = `${successText}! ✔`;
            setTimeout(() => resetButton(), 4000);
        })
        .catch(() => {
            vibrate(200);
            button.style.borderColor = 'red';
            button.style.color = 'red';
            button.innerHTML = `✖ ${errorText}`;
            setTimeout(() => resetButton(), 4000);
        });

    function resetButton() {
        button.innerHTML = originalText;
        button.style.borderColor = '';
        button.style.color = '';
        button.disabled = false;
    }
}
//================================================vibration
function vibrate(duration = 50) {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
}
//=========================================================
function goBack() {
    window.history.back();
}

async function subscribe() {
    const field =
        document.getElementById("subscriber-email");
    const email = field.value.trim();
    const failureDiv = document.getElementById("failure");
    const subscribeBtn = document.getElementById("subscribe");
    const url = "https://script.google.com/macros/s/AKfycbwCPPqtOOTZfcfJKNK_v422wkJaDiQo2D8FKRH25tvAXB_Rf7sMk_DDKgLFgDScOtOS/exec";


    // ✅ Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        vibrate(200);
        field.value = "";
        field.focus();
        failureDiv.style.opacity = 1;
        failureDiv.textContent = "Please enter a valid email address.";
        setTimeout(() => {
            failureDiv.style.opacity = 0;
        }, 3000);
        throw new Error("Manual error");
    }

    try {
        const formData = new FormData();
        formData.append("email", email);
        formData.append("mode", "default");

        const response = await fetch(url, { method: "POST", body: formData });
        const text = await response.text();

        if (text.includes("Success")) {
            navigator.vibrate(50);
        } else {
            vibrate(200);
            field.value = "";
            field.focus();
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
}

function showAlert(heading, message, buttonText) {
    vibrate(50);
    // Remove existing alert if any
    const existing = document.querySelector('.custom-alert');
    if (existing) existing.remove();

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.57)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
    });

    // Alert Box
    const box = document.createElement('div');
    Object.assign(box.style, {
        backgroundColor: '#000',
        borderRadius: '10px',
        border: '1px solid rgb(50,50,50)',
        textAlign: 'left',
        maxWidth: '300px',
        width: '80%',
        transform: 'translateY(-30px)'
    });

    // Heading
    const h = document.createElement('h3');
    h.textContent = heading;
    Object.assign(h.style, {
        margin: '0 0 10px',
        padding: '10px',
        borderBottom: '1px solid rgb(50,50,50)'
    });

    // Message
    const m = document.createElement('p');
    m.textContent = message;
    Object.assign(m.style, {
        padding: '0 10px'
    });

    // Button
    const btn = document.createElement('button');
    btn.textContent = buttonText;
    Object.assign(btn.style, {
        padding: '8px 16px',
        backgroundColor: '#141414ff',
        borderRadius: '5px',
        margin: '15px 0',
        position: 'relative',
        left: '100%',
        transform: 'translateX(calc(-100% - 13px))'
    });
    btn.onclick = () => overlay.remove();

    // Build and show
    box.appendChild(h);
    box.appendChild(m);
    box.appendChild(btn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}
