//=============================================================================================== include html components
document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("[data-include]").forEach(async (el) => {
    if (el.getAttribute("data-include") !== "nav.html") {
      const file = el.getAttribute("data-include");
      const res = await fetch(file);
      el.innerHTML = await res.text();
    }
    document.getElementById("year").textContent = new Date().getFullYear();
  });
});

//===============================================================================================toggle restricted
function toggleRestricted() {
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  document.querySelectorAll(".restricted").forEach((el) => {
    el.style.display = isLoggedIn ? "block" : "none";
  });
  document.querySelectorAll(".protected").forEach((el) => {
    el.style.display = isLoggedIn ? "none" : "flex";
  });
  document.querySelectorAll(".loginBtn").forEach((el) => {
    el.style.display = isLoggedIn ? "none" : "inline-block";
  });
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-block" : "none";
}

//===============================================================================================common button behavior
function handleButtonAction(
  buttonId,
  loaderText,
  successText,
  taskFunction,
  errorText = "Failed",
) {
  const button = document.getElementById(buttonId);
  if (!button || typeof taskFunction !== "function") return;

  const originalText = button.innerHTML;
  button.disabled = true;
  button.style.borderColor = "gold";
  button.style.color = "gold";
  button.innerHTML = `<img src="/resrc/images/icons/loading.gif" style="height: 15px; margin-bottom: -2px; filter: brightness(0) invert(1)"> ${loaderText}...`;

  Promise.resolve()
    .then(taskFunction)
    .then(() => {
      button.style.borderColor = "green";
      button.style.color = "limegreen";
      button.innerHTML = `${successText}! ✔`;
      setTimeout(() => resetButton(), 4000);
    })
    .catch(() => {
      vibrate(200);
      button.style.borderColor = "red";
      button.style.color = "red";
      button.innerHTML = `✖ ${errorText}`;
      setTimeout(() => resetButton(), 4000);
    });

  function resetButton() {
    button.innerHTML = originalText;
    button.style.borderColor = "";
    button.style.color = "";
    button.disabled = false;
  }
}
//================================================================================================================vibration
function vibrate(duration = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(duration);
  }
}
//================================================================================================================== go back
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "src/pages/home.html";
  }
}
//================================================================================================================== subscribe
function subscribe() {
  handleButtonAction(
    "subscribe-btn", // button ID
    "Subscribing", // loader text
    "Subscribed", // success text
    async () => {
      const field = document.getElementById("subscriber-email");
      const email = field.value.trim();
      const failureDiv = document.getElementById("failure");
      const url =
        "https://script.google.com/macros/s/AKfycbypXNCrvYZL-flWLRoD7DcdcgUaf98FzzDQCUdkaNURzeBFQWNqjL8vEubY8FAKM-JT/exec"; // replace with your Apps Script URL

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (navigator.vibrate) navigator.vibrate(200);
        field.value = "";
        field.focus();
        showMessage(failureDiv, "Please enter a valid email address.");
        throw new Error("Invalid email"); // fail for handleButtonAction
      }

      const formData = new FormData();
      formData.append("email", email);
      formData.append("mode", "subscribe");

      const response = await fetch(url, { method: "POST", body: formData });
      const text = await response.text();

      if (!text.toLowerCase().includes("success")) {
        showMessage(failureDiv, text, false);
        throw new Error("Failed subscribe");
      }

      showMessage(failureDiv, text, true);
    },
    "Failed",
  );
}
//================================================================================================================== unsubscribe
function unsubscribe() {
  handleButtonAction(
    "unsubscribe-btn", // button ID
    "Unsubscribing", // loader text
    "Unsubscribed", // success text
    async () => {
      const field = document.getElementById("unsubscribe-email");
      const email = field.value.trim();
      const failureDiv = document.getElementById("failure");
      const url =
        "https://script.google.com/macros/s/AKfycbypXNCrvYZL-flWLRoD7DcdcgUaf98FzzDQCUdkaNURzeBFQWNqjL8vEubY8FAKM-JT/exec"; // replace with your Apps Script URL

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (navigator.vibrate) navigator.vibrate(200);
        field.value = "";
        field.focus();
        showMessage(failureDiv, "Please enter a valid email address.");
        throw new Error("Invalid email");
      }

      const formData = new FormData();
      formData.append("email", email);
      formData.append("mode", "unsubscribe");

      const response = await fetch(url, { method: "POST", body: formData });
      const text = await response.text();

      if (!text.toLowerCase().includes("success")) {
        showMessage(failureDiv, text, false);
        throw new Error("Failed unsubscribe");
      }

      showMessage(failureDiv, text, true);
    },
    "Failed",
  );
}
//================================================================================================================== show message
function showMessage(div, message, success = false) {
  div.style.opacity = 1;
  div.style.color = success ? "green" : "red";
  div.textContent = message;
  setTimeout(() => {
    div.style.opacity = 0;
  }, 3000);
}

//================================================================================================================== show alert
/**
 * Show a customizable alert
 * @param {string} heading - Alert heading
 * @param {string} message - Alert message
 * @param {Array<{text: string, onClick?: Function}>} buttons - Array of button objects
 * @param {string} [link] - Optional clickable link
 */
function showAlert(heading, message, buttons = [{ text: "OK" }], link) {
  vibrate(50);

  // Remove existing alert
  const existing = document.querySelector(".custom-alert");
  if (existing) existing.remove();

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = "custom-alert";
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.57)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  });

  // Alert Box
  const box = document.createElement("div");
  Object.assign(box.style, {
    backgroundColor: "#000000",
    borderRadius: "10px",
    border: "1px solid #303030",
    textAlign: "left",
    maxWidth: "310px",
    width: "85%",
  });

  // Heading
  const h = document.createElement("h3");
  h.textContent = heading;
  Object.assign(h.style, {
    margin: "0 0 10px",
    padding: "10px",
    borderBottom: "1px solid rgb(56,56,56)",
  });

  // Message
  const m = document.createElement("p");
  m.textContent = message;
  Object.assign(m.style, { padding: "0 10px" });

  box.appendChild(h);
  box.appendChild(m);

  // Optional link
  if (link) {
    const a = document.createElement("a");
    a.href = link;
    a.textContent = link;
    a.target = "_blank";
    Object.assign(a.style, {
      display: "block",
      padding: "0 10px 10px",
      color: "#1bbeff",
      textDecoration: "underline",
      wordBreak: "break-all",
    });
    box.appendChild(a);
  }

  // Buttons container
  const btnContainer = document.createElement("div");
  Object.assign(btnContainer.style, {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "10px",
  });

  buttons.forEach((btnObj) => {
    const btn = document.createElement("button");
    btn.textContent = btnObj.text;
    Object.assign(btn.style, {
      padding: "8px 16px",
      backgroundColor: "#141414ff",
      borderRadius: "5px",
      border: "1px solid rgb(50,50,50)",
      color: "white",
      cursor: "pointer",
    });

    if (btnObj.focus) {
      btn.style.backgroundColor = "rgb(237, 237, 237)";
      btn.style.color = "black";
      btn.focus();
    }

    btn.onclick = () => {
      overlay.remove();
      if (btnObj.onClick) btnObj.onClick();
    };

    btnContainer.appendChild(btn);
  });

  box.appendChild(btnContainer);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

//================================================================================================================== open external links
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[target="_blank"]');
  if (!link) return;

  e.preventDefault();

  const decodedUrl = decodeURI(link.href);

  showAlert(
    "Open Link?",
    "This link will open in a new tab:",
    [
      { text: "Cancel", onClick: () => {} },
      {
        text: "Open",
        focus: true,
        onClick: () => window.open(link.href, "_blank"),
      },
    ],
    decodedUrl,
  );
});

//================================================================================================================== open modal
window.openModal = function ({
  imgSrc,
  name = "",
  title = "",
  subtitle = "",
  extraInfo = {},
  socials = {},
}) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("modal-image");
  const modalName = document.getElementById("modal-name");
  const modalTitle = document.getElementById("modal-title");
  const modalSubtitle = document.getElementById("modal-subtitle"); // optional extra line
  const socialsContainer = document.getElementById("modal-socials");

  // Set image
  modalImg.src = imgSrc;

  // Set title and subtitle
  if (modalTitle) {
    modalTitle.style.fontWeight = "bold";
    modalTitle.style.fontStyle = "italic";
    modalTitle.textContent = title;
  }
  modalSubtitle ? (modalSubtitle.textContent = subtitle) : null;
  modalName ? (modalName.textContent = name) : null;

  // Extra info (like role, batch, branch)
  if (extraInfo) {
    for (const [key, value] of Object.entries(extraInfo)) {
      const el = document.getElementById(`modal-${key}`);
      if (el) el.textContent = value;
    }
  }

  // Social links
  if (socialsContainer) {
    socialsContainer.innerHTML = "";
    const icons = {
      instagram: "fab fa-instagram",
      linkedin: "fab fa-linkedin",
      email: "far fa-envelope",
      github: "fab fa-github",
      website: "fas fa-globe",
    };
    for (const [platform, link] of Object.entries(socials)) {
      if (link && icons[platform]) {
        socialsContainer.innerHTML += `<a href="${link}" target="_blank"><i class="${icons[platform]}"></i></a>`;
      }
    }
  }

  // Show modal
  document.querySelector("section").classList.add("modal-active");
  let footer = document.querySelector("footer");
  if (footer) {
    footer.classList.add("modal-active");
  }
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Close handlers
  const closeModal = () => {
    document.querySelector("section").classList.remove("modal-active");
    let footer = document.querySelector("footer");
    if (footer) {
      footer.classList.remove("modal-active");
    }
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    window.removeEventListener("click", outsideClick);
  };
  const outsideClick = (e) => {
    if (e.target === modal) closeModal();
  };

  document
    .querySelector(".modal-close")
    ?.addEventListener("click", closeModal, { once: true });
  window.addEventListener("click", outsideClick);
};

//================================================================================================================== open search
document.addEventListener("keydown", (e) => {
  if (e.key === "\\") {
    e.preventDefault();
    const searchToggle = parent.document.getElementById("searchToggle");
    searchToggle.click();
  }
});

//================================================================================================================== password toggle
document.addEventListener("DOMContentLoaded", () => {
  const initPasswordToggles = () => {
    document.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.hasAttribute('data-password-toggle-initialized')) return;
      input.setAttribute('data-password-toggle-initialized', 'true');

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.width = input.style.width || "100%";
      wrapper.style.marginBottom = window.getComputedStyle(input).marginBottom || "10px";
      
      input.style.marginBottom = "0";
      input.style.paddingRight = "40px";
      
      const btn = document.createElement("button");
      btn.type = "button";
      const eyeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" style="width:16px;height:16px;fill:currentColor;"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 92.9-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.8-35.7-46.1-87.7-92.9-131.1C433.5 68.8 368.8 32 288 32zM128 256a160 160 0 1 1 320 0 160 160 0 1 1 -320 0zm160-80a80 80 0 1 0 0 160 80 80 0 1 0 0-160z"/></svg>';
      const eyeSlashSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" style="width:16px;height:16px;fill:currentColor;"><path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294c8.4-14.2 13.5-30.8 13.5-48.5c0-51-41.5-92.5-92.5-92.5c-17.7 0-34.3 5.1-48.5 13.5L223.1 149.5zM118.3 289l-58.4 45.7C45.2 365.4 75.6 414.1 121 455c45.4 40.9 107.5 75 186.2 75c65.5 0 120.9-24.3 163.4-56.2L428.1 440.6c-31 16-64.8 25.4-99.3 25.4c-78.3 0-141.4-35.5-187-77.9C97.6 346.8 68.1 300.2 55.4 269.8L118.3 289zM302.2 411l-89.9-70.4c-8.9-20.7-14.1-43.5-14.1-67.6c0-43.1 15.6-82.5 41.5-112.5l-47.5-37.2C172 153.6 160 186 160 220.8c0 79.5 64.5 144 144 144c11.9 0 23.5-1.4 34.6-4.1l-42.3-33.1c-16.1 1.9-32.8 1.9-48.5 0l54.4 42.6z"/></svg>';
      
      btn.innerHTML = eyeSvg;
      btn.style.position = "absolute";
      btn.style.right = "10px";
      btn.style.background = "transparent";
      btn.style.border = "none";
      btn.style.color = "#c8c8c8";
      btn.style.cursor = "pointer";
      btn.style.padding = "0";
      btn.style.minWidth = "auto";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        // Since input type changes, we should use the actual element reference
        // However, checking the current type is more reliable.
        // Also note: we need to find the input sibling because we might have changed it.
        if (input.type === "password") {
          input.type = "text";
          btn.innerHTML = eyeSlashSvg;
        } else {
          input.type = "password";
          btn.innerHTML = eyeSvg;
        }
      });

      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(btn);
    });
  };
  
  initPasswordToggles();
  const observer = new MutationObserver(initPasswordToggles);
  observer.observe(document.body, { childList: true, subtree: true });
});
