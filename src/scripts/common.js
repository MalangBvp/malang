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
