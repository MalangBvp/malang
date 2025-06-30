const totalArtworks = 100; // change this if you have a different number
const artworks = Array.from({ length: totalArtworks }, (_, i) => ({
    src: `../../resrc/images/artworks/${(i + 1)%6}.jpg`,
    alt: `Artwork ${i + 1}`
}));

let currentIndex = 0;
const batchSize = 20;
const gallery = document.getElementById('gallery');
const viewMoreBtn = document.getElementById('viewMoreBtn');

function loadArtworks() {
    const nextBatch = artworks.slice(currentIndex, currentIndex + batchSize);
    nextBatch.forEach(({ src, alt }) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="${src}" alt="${alt}"/>`;
        gallery.appendChild(item);
    });
    currentIndex += batchSize;

    if (currentIndex >= artworks.length) {
        viewMoreBtn.style.display = 'none';
    }
}

viewMoreBtn.addEventListener('click', loadArtworks);
window.addEventListener('DOMContentLoaded', loadArtworks);

