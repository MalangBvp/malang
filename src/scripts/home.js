window.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("sliderContainer");
    let isScrolling = false;
    let viewportWidth = window.innerWidth - 16;

    window.addEventListener("wheel", function (e) {
        const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
        const atEnd = slider.scrollLeft >= maxScrollLeft - 5; // small buffer
        const atStart = slider.scrollLeft <= 5;

        // Only hijack vertical scroll if slider hasn't finished scrolling
        if (!atEnd && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();

            if (!isScrolling) {
                isScrolling = true;

                const direction = e.deltaY > 0 ? 1 : -1;
                slider.scrollBy({
                    left: direction * viewportWidth,
                    behavior: "smooth"
                });

                setTimeout(() => {
                    isScrolling = false;
                }, 600);
            }
        }
    }, { passive: false });
});
