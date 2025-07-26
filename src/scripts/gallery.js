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
        item.classList.add('gallery-item', 'same');


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
            applyTheme();
            if (loader) loader.style.display = 'none';
        });
    }

    currentIndex += batchSize;

    if (currentIndex >= artworks.length) {
        viewMoreBtn.style.display = 'none';
    }
    applyTheme();
}

let imageMeta = {};

fetch("../../resrc/data/artworks.json")
    .then((res) => res.json())
    .then((data) => imageMeta = data);


const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-image");
const modalTitle = document.getElementById("modal-title");
const modalArtist = document.getElementById("modal-artist");
const closeModal = document.querySelector(".modal-close");

gallery.addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName === "IMG") {
        const fileName = target.src.split("/").pop();      // Get the file name
        const imageId = fileName.split(".")[0];            // Get the number before extension

        const meta = imageMeta[imageId];                   // Lookup in JSON

        modalImg.src = target.src;
        modalTitle.textContent = `Title: ${meta?.title || "NA"}`;
        modalArtist.textContent = `Artist: ${meta?.artist || "NA"}`;

        modal.style.display = "block";
        document.body.style.overflow = "hidden";
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