// Set your prefix here (must start and end with a slash)
const PREFIX = '/r/';

fetch('redirects.json')
  .then(response => response.json())
  .then(redirects => {
    const pathname = window.location.pathname;

    // Create minimal HTML with only the logo initially
    document.body.innerHTML = `
      <div class="container">
        <img src="/resrc/images/misc/malang.webp" alt="Malang" id="malangLogo">
        <p id="manualLinkContainer" style="opacity:0; transition-duration: 0.3s;">
          <a id="manualLink" href="#">Go</a>
        </p>
      </div>
    `;

    if (pathname.startsWith(PREFIX)) {
      const slug = window.location.hash.slice(2); // remove #/
      const targetUrl = redirects[slug];

      if (targetUrl) {
        // Set the href for manual link
        document.getElementById('manualLink').href = targetUrl;

        // Set fallback manual link visibility after 2 seconds
        setTimeout(() => {
          document.getElementById('manualLinkContainer').style.opacity = 1;
        }, 2000);

        // Attempt redirect
        window.location.replace(targetUrl);
      } else {
        document.body.innerHTML = `
          <div class="container">
            <img src="/resrc/images/misc/malang.webp" alt="Malang">
            <h1>404 - Page Not Found</h1>
            <p>No redirect found for "<code>${slug}</code>".</p>
          </div>
        `;
      }
    } else {
      document.body.innerHTML = `
        <div class="container">
          <img src="/resrc/images/misc/malang.webp" alt="Malang">
          <h1>Invalid URL.</h1>
          <p>This redirect only works under "<code>${PREFIX}</code>".</p>
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Redirect failed:', error);
    document.body.innerHTML = `
      <div class="container">
        <img src="/resrc/images/misc/malang.webp" alt="Malang">
        <h1>Something went wrong.</h1>
      </div>`;
  });
