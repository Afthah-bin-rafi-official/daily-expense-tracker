const STORAGE_KEY = "dailyExpenseTracker.expenses";
const DEBT_STORAGE_KEY = "dailyExpenseTracker.debts";

let expenses = [];
let debts = [];
let currentRange = "month"; // "week" | "month"

let chartByCategory = null;
let chartByDay = null;
let chartDebtsByPerson = null;

function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      expenses = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      expenses = parsed;
    } else {
      expenses = [];
    }
  } catch (e) {
    console.error("Failed to load expenses", e);
    expenses = [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function loadDebts() {
  try {
    const raw = localStorage.getItem(DEBT_STORAGE_KEY);
    if (!raw) {
      debts = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      debts = parsed;
    } else {
      debts = [];
    }
  } catch (e) {
    console.error("Failed to load debts", e);
    debts = [];
  }
}

function saveDebts() {
  localStorage.setItem(DEBT_STORAGE_KEY, JSON.stringify(debts));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatCurrency(amount) {
  return amount.toFixed(2);
}

function getTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  
  const [y, m, d] = parts;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = parseInt(m, 10) - 1;
  const mon = monthNames[monthIndex] || m;
  
  return `${d}/${mon}/${y}`;
}

function getStartOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7; // Monday as start
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getStartOfCurrentMonth() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function filterExpensesForRange(range) {
  const start =
    range === "week" ? getStartOfCurrentWeek() : getStartOfCurrentMonth();
  return expenses.filter((exp) => {
    const d = parseDate(exp.date);
    return d >= start;
  });
}

function groupByCategory(expensesList) {
  const map = {};
  for (const e of expensesList) {
    if (!map[e.category]) {
      map[e.category] = 0;
    }
    map[e.category] += Number(e.amount) || 0;
  }
  return map;
}

function groupByDay(expensesList) {
  const map = {};
  for (const e of expensesList) {
    if (!map[e.date]) {
      map[e.date] = 0;
    }
    map[e.date] += Number(e.amount) || 0;
  }
  return map;
}

function renderTable() {
  const tbody = document.getElementById("expense-tbody");
  const noExpensesEl = document.getElementById("no-expenses");
  const totalAllEl = document.getElementById("total-all");

  tbody.innerHTML = "";

  if (!expenses.length) {
    noExpensesEl.style.display = "block";
    totalAllEl.textContent = "0.00";
    return;
  }

  noExpensesEl.style.display = "none";

  const sorted = [...expenses].sort((a, b) => {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  let total = 0;

  for (const exp of sorted) {
    total += Number(exp.amount) || 0;

    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.className = "td-date";
    tdDate.textContent = formatDateDisplay(exp.date);

    const tdCategory = document.createElement("td");
    tdCategory.className = "td-category";
    const badge = document.createElement("span");
    badge.className = `badge-category badge-${exp.category || "Other"}`;
    const dot = document.createElement("span");
    dot.className = "badge-category-dot";
    const label = document.createElement("span");
    label.textContent = exp.category;
    badge.appendChild(dot);
    badge.appendChild(label);
    tdCategory.appendChild(badge);

    const tdDesc = document.createElement("td");
    tdDesc.className = "td-desc";
    tdDesc.textContent = exp.description || "";

    const tdAmount = document.createElement("td");
    tdAmount.classList.add("td-amount", "align-right");
    tdAmount.textContent = formatCurrency(Number(exp.amount) || 0);

    const tdActions = document.createElement("td");
    tdActions.className = "td-actions";
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "delete-btn";
    delBtn.addEventListener("click", () => {
      deleteExpense(exp.id);
    });
    tdActions.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdCategory);
    tr.appendChild(tdDesc);
    tr.appendChild(tdAmount);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  totalAllEl.textContent = formatCurrency(total);
}

function deleteExpense(id) {
  expenses = expenses.filter((e) => e.id !== id);
  saveExpenses();
  renderTable();
  updateAnalytics();
}

function renderDebts() {
  const tbody = document.getElementById("debt-tbody");
  const noDebtsEl = document.getElementById("no-debts");
  const totalDebtsEl = document.getElementById("total-debts");
  const bannerEl = document.getElementById("debt-reminder-banner");

  tbody.innerHTML = "";

  if (!debts.length) {
    noDebtsEl.style.display = "block";
    totalDebtsEl.textContent = "0.00";
    if (bannerEl) {
      bannerEl.style.display = "none";
      bannerEl.textContent = "";
    }
    return;
  }

  noDebtsEl.style.display = "none";

  let total = 0;

  for (const d of debts) {
    total += Number(d.amount) || 0;

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.className = "td-name";
    tdName.textContent = d.name;

    const tdType = document.createElement("td");
    tdType.className = "td-type";
    tdType.textContent = d.type === "borrowed" ? "Borrowed" : "Lent";

    const tdAmount = document.createElement("td");
    tdAmount.classList.add("td-amount", "align-right");
    tdAmount.textContent = formatCurrency(Number(d.amount) || 0);

    const tdGiven = document.createElement("td");
    tdGiven.className = "td-given";
    tdGiven.textContent = formatDateDisplay(d.date) || "";

    const tdReturn = document.createElement("td");
    tdReturn.className = "td-return";
    tdReturn.textContent = formatDateDisplay(d.returnDate) || "";

    const tdActions = document.createElement("td");
    tdActions.className = "td-actions";
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "delete-btn";
    delBtn.addEventListener("click", () => {
      deleteDebt(d.id);
    });
    tdActions.appendChild(delBtn);

    tr.appendChild(tdName);
    tr.appendChild(tdType);
    tr.appendChild(tdAmount);
    tr.appendChild(tdGiven);
    tr.appendChild(tdReturn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }

  totalDebtsEl.textContent = formatCurrency(total);

  if (bannerEl) {
    const upcoming = findNextDueDebt(debts);
    if (upcoming) {
      bannerEl.style.display = "block";
      if (upcoming.type === "borrowed") {
        bannerEl.textContent = `Reminder: You need to return ${formatCurrency(
          Number(upcoming.amount) || 0
        )} to ${upcoming.name} on ${formatDateDisplay(upcoming.returnDate)}`;
      } else {
        bannerEl.textContent = `Reminder: ${upcoming.name} should return ${formatCurrency(
          Number(upcoming.amount) || 0
        )} on ${formatDateDisplay(upcoming.returnDate)}`;
      }
    } else {
      bannerEl.style.display = "none";
      bannerEl.textContent = "";
    }
  }
}

function deleteDebt(id) {
  debts = debts.filter((d) => d.id !== id);
  saveDebts();
  renderDebts();
  updateAnalytics();
}

function findNextDueDebt(allDebts) {
  const today = new Date();
  let best = null;
  for (const d of allDebts) {
    if (!d.returnDate) continue;
    const due = parseDate(d.returnDate);
    if (due < today) continue;
    if (!best || due < parseDate(best.returnDate)) {
      best = d;
    }
  }
  return best;
}

function createOrUpdateCharts(rangeExpenses) {
  const byCategory = groupByCategory(rangeExpenses);
  const byDay = groupByDay(rangeExpenses);

  const byPerson = debts.reduce((acc, d) => {
    const typeLabel = d.type === "borrowed" ? "Borrowed" : "Lent";
    const key = `${d.name} (${typeLabel})`;
    if (!acc[key]) acc[key] = 0;
    acc[key] += Number(d.amount) || 0;
    return acc;
  }, {});

  const categoryLabels = Object.keys(byCategory);
  const categoryValues = Object.values(byCategory);

  const dayLabels = Object.keys(byDay).sort();
  const dayValues = dayLabels.map((d) => byDay[d]);
  const dayLabelsDisplay = dayLabels.map(formatDateDisplay);

  const debtLabels = Object.keys(byPerson);
  const debtValues = Object.values(byPerson);

  const categoryCtx = document
    .getElementById("chartByCategory")
    .getContext("2d");
  const dayCtx = document.getElementById("chartByDay").getContext("2d");
  const debtsCtx = document
    .getElementById("chartDebtsByPerson")
    .getContext("2d");

  if (!chartByCategory) {
    chartByCategory = new Chart(categoryCtx, {
      type: "bar",
      data: {
        labels: categoryLabels,
        datasets: [
          {
            label: "Amount",
            data: categoryValues,
            backgroundColor: "rgba(34, 227, 161, 0.85)", // mint bars
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(148, 163, 184, 0.25)" },
          },
        },
      },
    });
  } else {
    chartByCategory.data.labels = categoryLabels;
    chartByCategory.data.datasets[0].data = categoryValues;
    chartByCategory.update();
  }

  if (!chartByDay) {
    chartByDay = new Chart(dayCtx, {
      type: "line",
      data: {
        labels: dayLabelsDisplay,
        datasets: [
          {
            label: "Amount",
            data: dayValues,
            borderColor: "rgba(14, 165, 233, 1)", // cyan line
            backgroundColor: "rgba(14, 165, 233, 0.22)",
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(148, 163, 184, 0.25)" },
          },
        },
      },
    });
  } else {
    chartByDay.data.labels = dayLabelsDisplay;
    chartByDay.data.datasets[0].data = dayValues;
    chartByDay.update();
  }

  if (!chartDebtsByPerson) {
    chartDebtsByPerson = new Chart(debtsCtx, {
      type: "bar",
      data: {
        labels: debtLabels,
        datasets: [
          {
            label: "Debt Amount",
            data: debtValues,
            backgroundColor: "rgba(255, 69, 58, 0.8)", // soft crimson for risk
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(148, 163, 184, 0.25)" },
          },
        },
      },
    });
  } else {
    chartDebtsByPerson.data.labels = debtLabels;
    chartDebtsByPerson.data.datasets[0].data = debtValues;
    chartDebtsByPerson.update();
  }
}

function updateAnalytics() {
  const rangeExpenses = filterExpensesForRange(currentRange);
  const totalRangeEl = document.getElementById("total-range");
  const total = rangeExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );
  totalRangeEl.textContent = formatCurrency(total);

  createOrUpdateCharts(rangeExpenses);
}

function setUpRangeButtons() {
  const buttons = document.querySelectorAll(".toggle-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = btn.dataset.range;
      if (!range || range === currentRange) return;
      currentRange = range;
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateAnalytics();
    });
  });
}

function setUpForm() {
  const form = document.getElementById("expense-form");
  const dateInput = document.getElementById("date");
  const categoryInput = document.getElementById("category");
  const amountInput = document.getElementById("amount");
  const descriptionInput = document.getElementById("description");

  dateInput.value = getTodayISO();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = dateInput.value;
    const category = categoryInput.value;
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (!date || !category || !amount || amount <= 0) {
      alert("Please enter a date, category, and a positive amount.");
      return;
    }

    const expense = {
      id: generateId(),
      date,
      category,
      amount,
      description,
    };

    expenses.push(expense);
    saveExpenses();
    renderTable();
    updateAnalytics();

    amountInput.value = "";
    descriptionInput.value = "";
    categoryInput.value = "";
    dateInput.value = getTodayISO();
  });
}

function setUpDebtForm() {
  const form = document.getElementById("debt-form");
  const typeInput = document.getElementById("debt-type");
  const nameInput = document.getElementById("debt-name");
  const amountInput = document.getElementById("debt-amount");
  const dateInput = document.getElementById("debt-date");
  const returnDateInput = document.getElementById("debt-return-date");
  const reminderSelect = document.getElementById("debt-reminder");

  const today = getTodayISO();
  dateInput.value = today;
  returnDateInput.value = "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const type = typeInput ? typeInput.value : "lent";
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const returnDate = returnDateInput.value;
    const reminder = reminderSelect ? reminderSelect.value : "none";

    if (!name || !amount || amount <= 0 || !date) {
      alert("Please enter person name, given date and a positive amount.");
      return;
    }

    const debt = {
      id: generateId(),
      type,
      name,
      amount,
      date,
      returnDate,
      reminder,
    };

    debts.push(debt);
    saveDebts();
    renderDebts();
    updateAnalytics();

    nameInput.value = "";
    amountInput.value = "";
    dateInput.value = getTodayISO();
    returnDateInput.value = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadExpenses();
  loadDebts();
  setUpForm();
  setUpDebtForm();
  setUpRangeButtons();
  renderTable();
  renderDebts();
  updateAnalytics();
});

