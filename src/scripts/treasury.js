const treasuryURL =
  "https://script.google.com/macros/s/AKfycbwPgC8mtrQFktYnjVMWMzejbVLcUGkM38TnAh11TdVsegCsSID1B3XL1w-ow3Bhsv-2kw/exec";

// 🔁 REPLACE WITH YOUR SHEET ID
const SHEET_ID = "1dq2tuNUxtd1JJunmj8rrZR3MDPlfxn_C0bTogxmd0wo";
const sheetURL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

let areaChart, barChart;

// ======================
// LOAD TOTAL
// ======================
async function loadTreasuryTotal() {
  try {
    const res = await fetch(treasuryURL);
    const data = await res.json();

    document.getElementById("treasury-total").innerText =
      `₹ ${Number(data.total).toFixed(2)}/-`;
  } catch {
    document.getElementById("treasury-total").innerText = "Couldn't Fetch.";
  }
}

// ======================
// FETCH SHEET DATA (NO APPS SCRIPT CHANGE)
// ======================
async function loadSheetData() {
  const res = await fetch(sheetURL);
  const text = await res.text();

  const json = JSON.parse(text.substring(47, text.length - 2));
  const rows = json.table.rows;

  return rows.map((r) => ({
    timestamp: new Date(r.c[0]?.v),
    header: r.c[1]?.v || "Other",
    amount: parseFloat(r.c[2]?.v || 0),
  }));
}

// ======================
// RENDER CHARTS
// ======================
async function renderCharts() {
  try {
    const rows = await loadSheetData();

    rows.sort((a, b) => a.timestamp - b.timestamp);

    let balance = 0;
    const labels = [];
    const balanceData = [];
    const categoryTotals = {};

    rows.forEach((r) => {
      balance += r.amount;

      labels.push(r.timestamp.toLocaleDateString());
      balanceData.push(Number(balance.toFixed(2)));

      if (r.amount < 0) {
        categoryTotals[r.header] =
          (categoryTotals[r.header] || 0) + Math.abs(r.amount);
      }
    });

    // ======================
    // AREA CHART (GRADIENT)
    // ======================
    const ctx = document.getElementById("areaChart").getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(0, 255, 213, 0.5)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    if (areaChart) areaChart.destroy();

    areaChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: balanceData,
            fill: true,
            backgroundColor: gradient,
            borderColor: "rgba(0, 255, 213, 1)",
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Amount / Time",
            color: "#333",
            font: {
              size: 16,
              weight: "bold",
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => "₹" + v,
            },
          },
        },
      },
    });

    // ======================
    // BAR CHART (EXPENSES)
    // ======================
    const barCtx = document.getElementById("barChart").getContext("2d");

    if (barChart) barChart.destroy();

    barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: Object.keys(categoryTotals),
        datasets: [
          {
            data: Object.values(categoryTotals),
            backgroundColor: "rgba(0, 255, 213, 0.5)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Expense / Head",
            color: "#333",
            font: {
              size: 16,
              weight: "bold",
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (v) => "₹" + v,
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Chart error:", err);
  }
}

// ======================
// LOG TRANSACTION
// ======================
function logTransaction(e) {
  e.preventDefault();

  handleButtonAction(
    "log-btn",
    "Logging",
    "Logged",
    async () => {
      const header = document.getElementById("header").value.trim();
      const amountInput = document.getElementById("amount");

      let amount = parseFloat(amountInput.value.trim());
      const sign = document.querySelector('input[name="sign"]:checked').value;

      if (isNaN(amount) || amount <= 0) {
        showAlert("Invalid Input", "Amount must be greater than 0.", [
          { text: "OK" },
        ]);
        throw new Error("Invalid amount");
      }

      if (sign === "-") amount = -amount;

      const formData = new FormData();
      formData.append("mode", "add");
      formData.append("header", header);
      formData.append("amount", amount);

      const res = await fetch(treasuryURL, { method: "POST", body: formData });
      const text = await res.text();

      if (!text.toLowerCase().includes("success")) {
        showAlert("Error", text, [{ text: "OK" }]);
        throw new Error("Failed");
      }

      showAlert("Success", "Transaction logged.", [{ text: "OK" }]);

      document.getElementById("treasury-form").reset();
      document.getElementById("minus").checked = true;

      await loadTreasuryTotal();
      await renderCharts();
    },
    "Failed",
  );
}

// ======================
// INIT
// ======================
loadTreasuryTotal();
renderCharts();
