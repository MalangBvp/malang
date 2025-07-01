const ctx = document.getElementById('chart').getContext('2d');

// Example data — replace with your real data
const labels = ['May', 'Jun','Jul'];
const dataPoints = [118,188,338];

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
                gradient.addColorStop(0, 'rgba(13, 173, 48, 0.3)');
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