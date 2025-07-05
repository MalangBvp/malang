const totalphotographs = 40;
const photographs = Array.from({ length: totalphotographs }, (_, i) => ({
    src: `../../resrc/images/photographs/${(i + 1) % 4}.jpeg`,
    alt: `Artwork ${i + 1}`
}));

let currentIndex = 0;
const batchSize = 20;
const film1 = document.getElementById('film1');
const film2 = document.getElementById('film2');

function loadphotographs() {
    const fragment1 = document.createDocumentFragment();
    const fragment2 = document.createDocumentFragment();
    const nextBatch = photographs.slice(currentIndex, currentIndex + batchSize);
    const imgElements = [];

    nextBatch.forEach(({ src, alt }, idx) => {
        const item = document.createElement('div');
        item.className = 'photo';

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;

        if (currentIndex !== 0) {
            img.loading = 'lazy';
        }

        item.appendChild(img);
        imgElements.push(img);

        // First 3 items go to fragment1, then alternate between fragment2 and fragment1
        if ((currentIndex + idx) < 4 || ((currentIndex + idx - 3) % 2 === 0)) {
            fragment1.appendChild(item);
        } else {
            fragment2.appendChild(item);
        }

    });

    film1.appendChild(fragment1);
    film2.appendChild(fragment2);

    if (currentIndex === 0) {
        const loader = document.getElementById('loader');
        const timeoutId = setTimeout(() => {
            if (loader) loader.style.display = 'none';
        }, 5000);

        Promise.all(imgElements.map(img => new Promise(resolve => {
            if (img.complete) resolve();
            else img.onload = img.onerror = resolve;
        }))).then(() => {
            clearTimeout(timeoutId);
            if (loader) loader.style.display = 'none';
        });
    }

    currentIndex += batchSize;
}

window.addEventListener('scroll', () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (nearBottom) {
        loadphotographs();
    }
});
window.addEventListener('DOMContentLoaded', loadphotographs);

let imageMeta = {};

fetch("../../resrc/photographs.json")
    .then(res => res.json())
    .then(data => imageMeta = data);

const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-image");
const modalTitle = document.getElementById("modal-title");
const modalArtist = document.getElementById("modal-artist");
const closeModal = document.querySelector(".modal-close");

// Attach to both film1 and film2
[film1, film2].forEach(film => {
    film.addEventListener("click", (e) => {
        const target = e.target;
        if (target.tagName === "IMG") {
            const fileName = target.src.split("/").pop();
            const imageId = fileName.split(".")[0];
            const meta = imageMeta[imageId];

            modalImg.src = target.src;
            modalTitle.textContent = `Title: ${meta?.title || "NA"}`;
            modalArtist.textContent = `Shot By: ${meta?.artist || "NA"}`;

            modal.style.display = "flex";
            document.body.style.overflow = "hidden";
        }
    });
});

closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    document.body.style.overflow = "scroll";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "scroll";
    }
});

function parallax() {
    const yP = -window.scrollY / 4;
    film1.style.transform = `translateY(${yP}px)`;
}

window.addEventListener("scroll", function () {
    parallax();
});