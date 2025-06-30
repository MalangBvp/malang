document.addEventListener("DOMContentLoaded", function () {
    const burgerButton = document.getElementById("burger");
    const burger = document.querySelector(".burger");
    const nav = document.querySelector("nav");

    burgerButton.addEventListener("click", function () {
        nav.classList.toggle("active");
        burgerButton.classList.toggle("active");
        document.getElementsByTagName("section").item(0).classList.toggle("active");

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
