let currentIndex = 0;
const batchSize = 6;
const gallery = document.getElementById('gallery');
const viewMoreBtn = document.getElementById('viewMoreBtn');
const photographsBtn = document.getElementById('photographs');
const artworksBtn = document.getElementById('artworks');
const loader = document.getElementById('loader');
const filters = document.querySelectorAll('.filter-btn');

let imageMeta = {};
let currentMode = 'artworks'; // 'artworks' or 'photographs'

function loadMetadata(mode) {
    const path = mode === 'artworks'
        ? "../../resrc/data/artworks.json"
        : "../../resrc/data/photographs.json";

    return fetch(path)
        .then(res => res.json())
        .then(data => {
            imageMeta = data;
            populateFilters(data);
        })
        .catch(() => {
            imageMeta = {};
            document.getElementById('filters-type').innerHTML = '';
            document.getElementById('filters-artist').innerHTML = '';
        });
}

function populateFilters(data) {
    const types = new Set();
    const artists = new Set();

    Object.values(data).forEach(item => {
        if (item.type) types.add(item.type);
        if (item.artist) artists.add(item.artist);
    });

    // Type filters
    const typeContainer = document.getElementById('filters-type');
    typeContainer.innerHTML = '<p>Type: </p>';
    typeContainer.innerHTML += `<button class="filter-btn type" data-filter="all">All</button>`;
    types.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn type';
        btn.dataset.filter = type.replace(/\s+/g, '-');
        btn.textContent = type;
        typeContainer.appendChild(btn);
    });

    // Artist filters
    const artistContainer = document.getElementById('filters-artist');
    artistContainer.innerHTML = currentMode === 'artworks' ? '<p>Artist: </p>' : '<p>Shot By: </p>';
    artistContainer.innerHTML += `<button class="filter-btn artist" data-filter="all">All</button>`;
    artists.forEach(artist => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn artist';
        btn.dataset.filter = artist.replace(/\s+/g, '-');
        btn.textContent = artist;
        artistContainer.appendChild(btn);
    });

    // Rebind filter click events
    bindFilterEvents();
}

function bindFilterEvents() {
    // Type filters
    selectedType = 'all';
    document.querySelectorAll('.filter-btn.type').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedType = btn.dataset.filter;
            document.querySelectorAll('.filter-btn.type').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            applyFilters();
        });
    });

    // Artist filters
    selectedArtist = 'all';
    document.querySelectorAll('.filter-btn.artist').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedArtist = btn.dataset.filter;
            document.querySelectorAll('.filter-btn.artist').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            applyFilters();
        });
    });
}

function getImages(mode) {
    const total = mode === 'artworks' ? 6 : 20; // Set different totals for artworks and photographs

    return Array.from({ length: total }, (_, i) => {
        const imageId = (i).toString();
        const src = mode === 'artworks'
            ? `../../resrc/images/artworks/${imageId}.webp`
            : `https://picsum.photos/300/300?random=${imageId}`;

        const meta = imageMeta[imageId] || {};
        const type = (meta.type || 'unknown').replace(/\s+/g, '-');
        const artist = (meta.artist || 'unknown').replace(/\s+/g, '-');

        return {
            src,
            alt: `${meta.title || 'Untitled'}`,
            imageId,
            classList: `${type} ${artist}`
        };
    });
}

function loadImages(mode) {
    const allImages = getImages(mode);
    const filteredImages = [];

    // Try to collect batchSize images that match current filters
    for (let i = currentIndex; i < allImages.length && filteredImages.length < batchSize; i++) {
        const imgData = allImages[i];
        const classList = imgData.classList.split(/\s+/);
        const hasType = selectedType === 'all' || classList.includes(selectedType);
        const hasArtist = selectedArtist === 'all' || classList.includes(selectedArtist);

        if (hasType && hasArtist) {
            filteredImages.push(imgData);
        }
    }

    if (filteredImages.length === 0) {
        viewMoreBtn.style.display = 'none';
        return;
    }

    const fragment = document.createDocumentFragment();
    const imgElements = [];

    filteredImages.forEach(({ src, alt, classList }) => {
        const item = document.createElement('div');
        item.className = 'gallery-item same';

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.className = classList;

        if (currentIndex !== 0) img.loading = 'lazy';

        item.appendChild(img);
        fragment.appendChild(item);
        imgElements.push(img);
    });

    gallery.appendChild(fragment);

    const allImagesLoaded = imgElements.map(img =>
        new Promise(resolve => img.complete ? resolve() : img.onload = img.onerror = resolve)
    );

    if (currentIndex === 0 && loader) {
        const timeoutId = setTimeout(() => loader.style.display = 'flex', 5000);
        Promise.all(allImagesLoaded).then(() => {
            clearTimeout(timeoutId);
            applyTheme?.();
            loader.style.display = 'none';
        });
    } else {
        Promise.all(allImagesLoaded).then(() => {
            applyTheme?.();
            loader.style.display = 'none';
        });
    }

    currentIndex += filteredImages.length;

    // Hide "View More" if fewer than batchSize filtered images found
    if (filteredImages.length < batchSize || currentIndex >= allImages.length) {
        viewMoreBtn.style.display = 'none';
    }
}

function resetGalleryAndLoad(mode) {
    currentMode = mode;
    currentIndex = 0;
    gallery.innerHTML = '';
    viewMoreBtn.style.display = 'block';
    loader.style.display = 'flex'; // Show loader immediately

    loadMetadata(mode).then(() => {
        const allImages = getImages(mode);
        const nextBatch = allImages.slice(0, batchSize);
        const fragment = document.createDocumentFragment();
        const imgElements = [];

        nextBatch.forEach(({ src, alt, classList }) => {
            const item = document.createElement('div');
            item.classList.add('gallery-item', 'same');

            const img = document.createElement('img');
            img.src = src;
            img.alt = alt;
            img.className = classList;

            item.appendChild(img);
            fragment.appendChild(item);
            imgElements.push(img);
        });

        gallery.appendChild(fragment);

        const allImagesLoaded = imgElements.map(img =>
            new Promise(resolve => img.complete ? resolve() : img.onload = img.onerror = resolve)
        );

        Promise.all(allImagesLoaded).then(() => {
            applyTheme?.();
            loader.style.display = 'none';
        });

        currentIndex += batchSize;
    });
}


viewMoreBtn.addEventListener('click', () => loadImages(currentMode));
photographsBtn.addEventListener('click', () => resetGalleryAndLoad('photographs'));
artworksBtn.addEventListener('click', () => resetGalleryAndLoad('artworks'));
window.addEventListener('DOMContentLoaded', () => resetGalleryAndLoad('artworks'));

// Modal logic
const modal = document.getElementById("image-modal");
const modalImg = document.getElementById("modal-image");
const modalTitle = document.getElementById("modal-title");
const modalArtist = document.getElementById("modal-artist");
const closeModal = document.querySelector(".modal-close");

gallery.addEventListener("click", (e) => {
    const target = e.target;
    if (target.tagName === "IMG") {
        const fileName = target.src.split("/").pop();     // e.g., 1.webp
        const imageId = fileName.split('.')[0];           // e.g., "1"
        const meta = imageMeta[imageId] || {};

        modalImg.src = target.src;
        modalTitle.textContent = `Title: ${meta.title || "NA"}`;
        modalArtist.textContent = `Artist: ${meta.artist || "NA"}`;

        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
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

// Filter logic
let selectedType = 'all';
let selectedArtist = 'all';

function applyFilters() {
    currentIndex = 0;
    gallery.innerHTML = '';
    loadImages(currentMode);

    const allImages = document.querySelectorAll('.gallery-item img');
    let matchCount = 0;

    allImages.forEach(img => {
        const parent = img.parentElement;
        const classes = img.className.split(/\s+/);
        const hasType = selectedType === 'all' || classes.includes(selectedType);
        const hasArtist = selectedArtist === 'all' || classes.includes(selectedArtist);

        if (hasType && hasArtist) {
            parent.style.display = 'flex';
            matchCount++;
        } else {
            parent.style.display = 'none';
        }
    });

    const noneDiv = document.getElementById('none');
    noneDiv.style.display = matchCount === 0 ? 'flex' : 'none';
    viewMoreBtn.style.display = matchCount === 0 ? 'none' : 'block';
}

// Type filter buttons
document.querySelectorAll('.filter-btn.type').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedType = btn.dataset.filter;
        document.querySelectorAll('.filter-btn.type').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        applyFilters();
    });
});

// Artist filter buttons
document.querySelectorAll('.filter-btn.artist').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedArtist = btn.dataset.filter;
        document.querySelectorAll('.filter-btn.artist').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        applyFilters();
    });
});
