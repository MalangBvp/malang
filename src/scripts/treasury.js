fetch('/resrc/data/treasury.json')
    .then(response => response.json())
    .then(data => {
        const labels = data.labels;
        const actual = data.actual;
        const expected = data.expected;

        const ctx = document.getElementById('chart').getContext('2d');

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
    })
    .catch(error => showAlert('Error loading Data', error, 'OK'));

// Button Event Listeners (can stay outside)
document.getElementById("contribute").addEventListener("click", toggleContribution);
document.getElementById("done").addEventListener("click", toggleContribution);

function toggleContribution() {
    const section = document.querySelector("section");
    const card = document.querySelector(".card");
    const done = document.getElementById("done");

    const isDoneVisible = done.style.display === "block";

    if (isDoneVisible) {
        card.style.marginLeft = "-50vw";
        section.classList.remove("modal-active");
        done.style.display = "none";
    } else {
        section.classList.add("modal-active");
        done.style.display = "block";
        card.style.marginLeft = "50%";
    }
}