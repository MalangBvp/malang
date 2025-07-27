document.addEventListener("DOMContentLoaded", () => {
  fetch('../../resrc/data/events.json')
    .then(response => response.json())
    .then(events => {
      const container = document.querySelector(".events-list");
      const fragment = document.createDocumentFragment();

      events.forEach(event => {
        const div = document.createElement("div");
        div.className = "event";

        div.innerHTML = `
          <p class="event-name">${event.name}</p>
          <div class="event-info">
            <p class="event-date">${event.date}</p>
            <p class="event-location">${event.location}</p>
          </div>
          <img src="${event.image}" alt="${event.name}" loading="lazy" class="event-image same" />
          <p class="event-description">${event.description}</p>
          <div class="event-buttons">
            ${event.buttons.map(btn => `
              <button class="long-btn${btn.focus ? ' focus' : ''}" onclick="showAlert('${event.name}', '${btn.alertMessage}', 'OK')">
                ${btn.text}
              </button>
            `).join('')}
          </div>
        `;

        fragment.appendChild(div);
      });

      container.appendChild(fragment);
    })
    .catch(error => {
      console.error("Failed to load events.json:", error);
    });
});



calendar.addEventListener('load', () => {
    loader.style.display = 'none';
    calendar.style.display = 'block';
});