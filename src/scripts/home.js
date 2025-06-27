document.addEventListener("DOMContentLoaded", function () {
    const burgerButton = document.getElementById("burger");
    const burger = document.querySelector(".burger");
    const nav = document.querySelector("nav");

    burgerButton.addEventListener("click", function () {
        nav.classList.toggle("active");
        burgerButton.classList.toggle("active");

        const currentStyle = getComputedStyle(burger).justifyContent;

        if (currentStyle === "center") {
            burger.style.justifyContent = "space-around";
        } else {
            burger.style.justifyContent = "center";
        }
    });
});
