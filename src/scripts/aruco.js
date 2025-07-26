const video = document.getElementById('video');

navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: { ideal: "environment" } // Gently prefers back camera
  }
})
.then(stream => {
  video.srcObject = stream;
})
.catch(err => {
  console.error("Camera access error:", err);
  alert("Unable to access the camera. Please grant permission or try another browser.");
});
