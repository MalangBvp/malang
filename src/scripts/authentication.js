const form = document.getElementById('accessForm') || document.getElementById('redirectorForm');
const passwordInput = document.getElementById('password');

const redirectorForm = document.getElementById('redirectorForm');
if (redirectorForm) {
    var encoded = 'Z2Vudmlp';
    var url = 'https://malangbvp.github.io/go/help';
    postfix = document.getElementById('postfix');
    //live update of url
    postfix.addEventListener('input', function () {
        document.getElementById('url').textContent = postfix.value;
    });
} else {
    var encoded = 'bWFsYW5ncGFyaw==';
    var url = 'treasury.html';
}

form.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = passwordInput.value;

    const b64 = btoa(input);
    if (b64 === encoded) {
        window.location.href = url;
    } else {
        pwdElement=document.getElementById('password');
        pwdElement.value = '';
        pwdElement.focus();
        pwdElement.style.border= '1px solid rgb(250, 53, 53)';
        document.getElementById('error').style.opacity = 1;
        setTimeout(() => {
            pwdElement.style.border = '';
            document.getElementById('error').style.opacity = 0;
        }, 3000);
        navigator.vibrate(200);
    }
});

const canvas = document.getElementById('gradientCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let pointer = { x: canvas.width / 2, y: canvas.height / 2 };
let hue = 0;
let opacity = 0;
let targetOpacity = 0;
let lastMoveTime = Date.now();
let trail = [];

const maxTrailLength = 20;

// Resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Handle move
function updatePointer(e) {
  lastMoveTime = Date.now();
  targetOpacity = 1;

  if (e.touches && e.touches.length > 0) {
    pointer.x = e.touches[0].clientX;
    pointer.y = e.touches[0].clientY;
  } else {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }

  // Add current position to trail
  trail.push({ x: pointer.x, y: pointer.y, time: Date.now() });

  // Limit trail length
  if (trail.length > maxTrailLength) trail.shift();
}

// Animate
function animate() {
  const now = Date.now();
  if (now - lastMoveTime > 400) targetOpacity = 0;
  opacity += (targetOpacity - opacity) * 0.1;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (opacity > 0.01) {
    hue = (hue + 2) % 360;

    trail.forEach((point, i) => {
      const age = (now - point.time) / 400;
      const alpha = Math.max(0, opacity * (1 - age));
      const size = 100 * (1 - i / maxTrailLength); // smaller as it fades

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
      gradient.addColorStop(0, `hsla(${(hue + i * 10) % 360}, 100%, 60%, ${alpha * 0.6})`);
      gradient.addColorStop(0.4, `hsla(${(hue + 60 + i * 5) % 360}, 100%, 60%, ${alpha * 0.3})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  requestAnimationFrame(animate);
}

window.addEventListener('mousemove', updatePointer);
window.addEventListener('touchmove', updatePointer);
animate();
