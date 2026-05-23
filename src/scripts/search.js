document.addEventListener("DOMContentLoaded", async () => {
  const waitForElement = (selector) => {
    return new Promise((resolve) => {
      if (document.querySelector(selector))
        return resolve(document.querySelector(selector));
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  };

  const searchToggle = await waitForElement("#searchToggle");

  const res = await fetch("/src/components/search.html");
  const html = await res.text();
  document.body.insertAdjacentHTML("beforeend", html);

  const searchOverlay = document.getElementById("searchOverlay");
  const searchClose = document.getElementById("searchClose");
  const input = document.getElementById("searchInput");
  const resultsDiv = document.getElementById("searchResults");

  const response = await fetch("/resrc/data/search.json");
  const data = await response.json();

  const fuse = new Fuse(data, {
    keys: [
      { name: "title", weight: 0.4 },
      { name: "content", weight: 0.3 },
      { name: "tags", weight: 0.2 },
      { name: "category", weight: 0.1 },
    ],
    threshold: 0.35,
    includeMatches: true,
  });

  const categoryLabels = {
    page: "Page",
    alumni: "Alumni",
    artwork: "Artwork",
    photograph: "Photography",
    event: "Event",
  };


  function highlightText(text, indices) {
    if (!indices || !indices.length) return text;
    let result = "";
    let lastIndex = 0;
    indices.forEach(([start, end]) => {
      result += text.slice(lastIndex, start);
      result += `<mark>${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    });
    result += text.slice(lastIndex);
    return result;
  }

  function renderResults(results) {
    if (!results.length) {
      resultsDiv.innerHTML = `<div class="no-results">No results found.</div>`;
      return;
    }

    resultsDiv.innerHTML = results
      .map((r) => {
        const item = r.item;
        const titleMatch = r.matches?.find((m) => m.key === "title");
        const contentMatch = r.matches?.find((m) => m.key === "content");

        const highlightedTitle = highlightText(item.title, titleMatch?.indices);
        const contentPreview = item.content ? item.content.substring(0, 150) : "";
        const highlightedContent = highlightText(
          contentPreview,
          contentMatch?.indices,
        );

        const category = item.category || "page";
        const label = categoryLabels[category] || "Page";

        const tagsHtml =
          item.tags && item.tags.length
            ? `<span class="search-tags">${item.tags.slice(0, 3).map((t) => `<span class="search-tag">${t}</span>`).join("")}</span>`
            : "";

        return `
                    <a href="${item.url}" onclick="loadPage('${item.url}'); return false;" class="search-result-item">
                        <div class="search-result-header">
                            <span class="search-category-badge" data-category="${category}">${label}</span>
                        </div>
                        <strong>${highlightedTitle}</strong>
                        <small>${highlightedContent}${contentPreview.length > 150 ? "…" : ""}</small>
                        ${tagsHtml}
                    </a>
                `;
      })
      .join("");
  }

  searchToggle.addEventListener("click", () => {
    searchOverlay.style.display = "flex";
    input.focus();
    if (typeof vibrate === "function") vibrate(50);
  });

  searchClose.addEventListener("click", () => {
    searchOverlay.style.display = "none";
    input.value = "";
    resultsDiv.innerHTML = "";
  });

  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      if (query.length > 0) {
        const results = fuse.search(query);
        renderResults(results);
      } else {
        resultsDiv.innerHTML = "";
      }
    }, 200);
  });

  searchOverlay.addEventListener("click", (e) => {
    if (e.target === searchOverlay) {
      searchOverlay.style.display = "none";
    }
  });
});
