window.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("sliderContainer");
    let isScrolling = false;
    let viewportWidth = window.innerWidth - 16;

    // Desktop: Wheel Scroll
    window.addEventListener("wheel", function (e) {
        const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
        const atEnd = slider.scrollLeft >= maxScrollLeft - 5;
        const atStart = slider.scrollLeft <= 5;

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

    // Mobile: Touch Scroll
    let touchStartX = 0;
    let touchEndX = 0;

    slider.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    slider.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum swipe distance
        const deltaX = touchEndX - touchStartX;

        if (Math.abs(deltaX) > swipeThreshold && !isScrolling) {
            isScrolling = true;

            const direction = deltaX < 0 ? 1 : -1;
            slider.scrollBy({
                left: direction * viewportWidth,
                behavior: "smooth"
            });

            setTimeout(() => {
                isScrolling = false;
            }, 600);
        }
    }
});
