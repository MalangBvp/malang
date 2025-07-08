const labels = ['May', 'Jun', 'Jul'];
const dataPoints = [118, 188, 788];

const ctx = document.getElementById('chart').getContext('2d');
document.getElementById("contribute").addEventListener("click", toggleContribution);
document.getElementById("done").addEventListener("click", toggleContribution);
new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'Malang Treasury (₹)',
            data: dataPoints,
            fill: true,
            borderWidth: 1,
            borderColor: 'green',
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(13, 173, 48, 0.5)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                return gradient;
            },
            tension: 0.4,
            pointBackgroundColor: 'green',
            pointRadius: 1,
            pointHoverRadius: 3
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                display: false,
                labels: {
                    color: '#333',
                    font: {
                        size: 14
                    }
                }
            },
            tooltip: {
                backgroundColor: 'black',
                titleColor: '#fff',
                bodyColor: '#fff'
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#555'
                },
                grid: {
                    color: '#303030'
                }
            },
            y: {
                ticks: {
                    color: '#555'
                },
                grid: {
                    color: '#303030'
                },
                beginAtZero: true
            }
        }
    }
});

function toggleContribution() {
    const section = document.querySelector("section");
    const card = document.querySelector(".card");
    const done = document.getElementById("done");

    const isDoneVisible = done.style.display === "block";

    if (isDoneVisible) {
        // Reset styles
        card.style.marginLeft = "-50vw";
        section.classList.remove("treasury-active");
        done.style.display = "none";
    } else {
        // Activate section and show 'done'
        section.classList.add("treasury-active");
        done.style.display = "block";
        card.style.marginLeft = "50%";
    }
}