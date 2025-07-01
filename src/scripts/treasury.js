const ctx = document.getElementById('chart').getContext('2d');

// Example data — replace with your real data
const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const dataPoints = [1200, 1800, 2200, 3000, 2800, 3500];

new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [{
            label: 'Malang Treasury (₹)',
            data: dataPoints,
            fill: true,
            borderColor: '#6a0dad',
            backgroundColor: (ctx) => {
                const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(106, 13, 173, 0.4)');
                gradient.addColorStop(1, 'rgba(106, 13, 173, 0)');
                return gradient;
            },
            tension: 0.4,
            pointBackgroundColor: '#6a0dad',
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                labels: {
                    color: '#333',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            tooltip: {
                backgroundColor: '#6a0dad',
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
                    color: '#eee'
                }
            },
            y: {
                ticks: {
                    color: '#555'
                },
                grid: {
                    color: '#eee'
                },
                beginAtZero: true
            }
        }
    }
});
