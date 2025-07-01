const totalArtworks = 100; // change this if you have a different number
const artworks = Array.from({ length: totalArtworks }, (_, i) => ({
    src: `../../resrc/images/artworks/${(i + 1) % 6}.jpg`,
    alt: `Artwork ${i + 1}`
}));

let currentIndex = 0;
const batchSize = 20;
const gallery = document.getElementById('gallery');
const viewMoreBtn = document.getElementById('viewMoreBtn');
function loadArtworks() {
    const fragment = document.createDocumentFragment();
    const nextBatch = artworks.slice(currentIndex, currentIndex + batchSize);
    const imgElements = [];

    nextBatch.forEach(({ src, alt }) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;

        // Only lazy load if NOT first batch
        if (currentIndex !== 0) {
            img.loading = 'lazy';
        }

        item.appendChild(img);
        fragment.appendChild(item);
        imgElements.push(img);
    });

    gallery.appendChild(fragment);

    // Track if all images are loaded (or errored)
    const allImagesLoaded = imgElements.map(img => {
        return new Promise(resolve => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = img.onerror = resolve;
            }
        });
    });

    // Loader handling
    if (currentIndex === 0) {
        const loader = document.getElementById('loader');

        // Set fallback timeout (5 seconds)
        const timeoutId = setTimeout(() => {
            if (loader) loader.style.display = 'none';
        }, 5000);

        // Hide loader after images finish loading
        Promise.all(allImagesLoaded).then(() => {
            clearTimeout(timeoutId);
            if (loader) loader.style.display = 'none';
        });
    }

    currentIndex += batchSize;

    if (currentIndex >= artworks.length) {
        viewMoreBtn.style.display = 'none';
    }
}

const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-image");
const closeModal = document.querySelector(".modal-close");

gallery.addEventListener("click", (e) => {
    const target = e.target;
    document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
    if (target.tagName === "IMG") {
        modal.style.display = "block";
        modalImg.src = target.src;
    }
});

closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    document.body.style.overflow = "scroll"; // Restore scrolling when modal is closed
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "scroll"; // Restore scrolling when modal is closed
    }
});


viewMoreBtn.addEventListener('click', loadArtworks);
window.addEventListener('DOMContentLoaded', loadArtworks);