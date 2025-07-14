const labels = ['May', 'Jun', 'Jul'];
const actual = [118, 188, 788];
const expected = [0, 118, 1238];

const ctx = document.getElementById('chart').getContext('2d');
document.getElementById("contribute").addEventListener("click", toggleContribution);
document.getElementById("done").addEventListener("click", toggleContribution);

new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [
            {
                label: 'Expected Amount (₹)',
                data: expected,
                fill: true,
                borderWidth: 1,
                borderColor: 'gold',
                backgroundColor: (ctx) => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0.5, 'rgba(203, 179, 0, 0.5)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    return gradient;
                },
                tension: 0.4,
                pointBackgroundColor: 'gold',
                pointRadius: 2,
                pointHoverRadius: 4
            },
            {
                label: 'Actual Amount (₹)',
                data: actual,
                fill: true,
                borderWidth: 1,
                borderColor: 'cyan',
                backgroundColor: (ctx) => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.5)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    return gradient;
                },
                tension: 0.4,
                pointBackgroundColor: 'cyan',
                pointRadius: 2,
                pointHoverRadius: 4
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: '#777',
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
                    color: '#777'
                },
                grid: {
                    color: '#303030'
                }
            },
            y: {
                ticks: {
                    color: '#777'
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