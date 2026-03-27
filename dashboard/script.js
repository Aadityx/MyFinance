// 🔥 Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBeY5noIZbapkdJiGUHkZ1f2Q8B8iyzUtQ",
  authDomain: "zion-542a2.firebaseapp.com",
  databaseURL: "https://zion-542a2-default-rtdb.firebaseio.com",
  projectId: "zion-542a2",
  storageBucket: "zion-542a2.appspot.com",
  messagingSenderId: "472333505699",
  appId: "1:472333505699:web:51af49a05dec65e5bd9b16"
};

// 🔥 Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// 🔹 Global variables
let expenses = [];
let impulseChart = null;
let plannedChart = null;
let categoryChart = null;
const categories = ["Food", "Shopping", "Entertainment", "Rent", "Bills", "Groceries"];

// 🔹 Show/hide sections
window.showSection = (id) => {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  const section = document.getElementById(id);
  if (section) section.style.display = "block";
};

// 🔹 Populate category dropdown
function populateCategories() {
  const select = document.getElementById("category");
  select.innerHTML = `<option value="">Select Category</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.innerText = cat;
    select.appendChild(opt);
  });
}

// 🔹 Setup expense form
function setupForm(uid) {
  const form = document.getElementById("expenseForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const type = document.getElementById("type").value;

    if (!title || !amount || !category || !type) return alert("Fill all fields");

    try {
      const expenseRef = ref(db, `users/${uid}/expenses`);
      await push(expenseRef, {
        title,
        amount,
        category,
        type,
        created_at: new Date().toISOString()
      });
      form.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to add expense: " + err.message);
    }
  });
}

// 🔹 Start realtime updates
function startRealtime(uid) {
  const expensesRef = ref(db, `users/${uid}/expenses`);
  onValue(expensesRef, (snapshot) => {
    const data = snapshot.val() || {};
    expenses = Object.values(data);

    updateDashboard();
    updateRecentList();
    updateHistoryTable();
    updateCharts();
    updateInsights();
    updateCategoryChart();
  });
}

// 🔹 Dashboard updates
function updateDashboard() {
  let total = 0, categoryTotals = {}, impulseCount = 0;

  expenses.forEach(e => {
    total += e.amount;
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    if (e.type === "impulse") impulseCount++;
  });

  const topCategory = Object.keys(categoryTotals).length
    ? Object.keys(categoryTotals).reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b)
    : "-";

  const impulsePercent = expenses.length ? Math.round((impulseCount / expenses.length) * 100) : 0;

  document.getElementById("totalSpent").innerText = "₹" + total.toLocaleString();
  document.getElementById("monthlySpent").innerText = "₹" + total.toLocaleString();
  document.getElementById("topCategory").innerText = topCategory;
  document.getElementById("impulsePercent").innerText = impulsePercent + "%";
}

// 🔹 Insights updates
function updateInsights() {
  const insightBoxes = document.querySelectorAll(".insight-box");
  if (!expenses.length) {
    insightBoxes.forEach(box => box.innerHTML = "<p>No Data</p>");
    return;
  }

  const categoryTotals = {};
  const impulseTotals = {};
  let plannedTotal = 0, impulseTotal = 0;

  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    if (e.type === "impulse") {
      impulseTotals[e.category] = (impulseTotals[e.category] || 0) + e.amount;
      impulseTotal += e.amount;
    } else plannedTotal += e.amount;
  });

  const topCategory = Object.keys(categoryTotals).reduce((a,b) => categoryTotals[a] > categoryTotals[b] ? a : b);
  const topImpulse = Object.keys(impulseTotals).length 
    ? Object.keys(impulseTotals).reduce((a,b) => impulseTotals[a] > impulseTotals[b] ? a : b) 
    : "-";
  const plannedPercent = plannedTotal + impulseTotal ? Math.round((plannedTotal / (plannedTotal + impulseTotal)) * 100) : 0;

  insightBoxes[0].innerHTML = `<h3>Top Spending</h3><p>${topCategory}: ₹${categoryTotals[topCategory].toLocaleString()}</p>`;
  insightBoxes[1].innerHTML = `<h3>Most Impulse</h3><p>${topImpulse}: ₹${impulseTotals[topImpulse] ? impulseTotals[topImpulse].toLocaleString() : 0}</p>`;
  insightBoxes[2].innerHTML = `<h3>Planned Expenses</h3><p>${plannedPercent}% of total</p>`;
}

// 🔹 Recent list updates
function updateRecentList() {
  const recentList = document.getElementById("recentList");
  const recent = expenses.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,10);

  if (!recent.length) {
    recentList.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#aaa;">No recent expenses</td></tr>`;
    document.getElementById("historyCount").innerText = "0";
    return;
  }

  recentList.innerHTML = recent.map(e => `
    <tr>
      <td>${e.title}</td>
      <td class="amount">${e.amount.toLocaleString()}</td>
    </tr>
  `).join('');

  document.getElementById("historyCount").innerText = recent.length;
}

// 🔹 History table updates
function updateHistoryTable() {
  const tbody = document.getElementById("historyTableBody");
  const sorted = expenses.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  tbody.innerHTML = sorted.map((e,i) => `
    <div class="table-row">
      <span>${i+1}</span>
      <span class="col-name">${e.title}</span>
      <span class="date">${new Date(e.created_at).toLocaleDateString()}</span>
      <span class="${e.type}">${e.type}</span>
      <span class="${e.type}">${e.category}</span>
      <span class="col-amount">₹${e.amount}</span>
    </div>
  `).join('');

  document.getElementById("historyCount").innerText = expenses.length;
}

// 🔹 Charts updates
function updateCharts() {
  const impulseData = {}, plannedData = {};
  
  expenses.forEach(e => {
    if (e.type === "impulse") impulseData[e.category] = (impulseData[e.category]||0)+e.amount;
    else plannedData[e.category] = (plannedData[e.category]||0)+e.amount;
  });

  if (impulseChart) { impulseChart.destroy(); impulseChart = null; }
  if (plannedChart) { plannedChart.destroy(); plannedChart = null; }

  if (Object.keys(impulseData).length) {
    impulseChart = new Chart(document.getElementById("impulseChart").getContext('2d'), {
      type: "doughnut",
      data: { labels: Object.keys(impulseData), datasets: [{ data: Object.values(impulseData), backgroundColor: ["#ef4444","#f97316","#fb7185","#facc15","#22c55e","#3b82f6"] }] },
      options: { responsive:true, animation:{ duration:500 } }
    });
  }

  if (Object.keys(plannedData).length) {
    plannedChart = new Chart(document.getElementById("plannedChart").getContext('2d'), {
      type: "doughnut",
      data: { labels: Object.keys(plannedData), datasets: [{ data: Object.values(plannedData), backgroundColor: ["#10b981","#34d399","#6ee7b7","#3b82f6","#fbbf24","#f472b6"] }] },
      options: { responsive:true, animation:{ duration:500 } }
    });
  }
}

// 🔹 Category chart
function updateCategoryChart() {
  const categoryTotals = {};
  expenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount; });

  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;
  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels: Object.keys(categoryTotals).length ? Object.keys(categoryTotals) : ["No Data"], datasets:[{ data:Object.values(categoryTotals).length ? Object.values(categoryTotals) : [1], backgroundColor:["#ef4444","#f97316","#fb7185","#10b981","#34d399","#6ee7b7"] }]},
    options:{ responsive:true }
  });
}

// 🔹 Sidebar clicks
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".sidebar ul li").forEach(li => {
    li.addEventListener("click", () => {
      const text = li.textContent.trim().toLowerCase();
      if (text === "dashboard") showSection("dashboardSection");
      if (text === "add expense") showSection("addSection");
      if (text === "history") showSection("historySection");
      if (text === "insights") showSection("insightsSection");
    });
    showSection("dashboardSection");
  });

  populateCategories();
});

// 🔐 Auth check
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "../login/login.html";
  else {
    startRealtime(user.uid);
    setupForm(user.uid);
  }
});

// 🔹 Logout
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to logout?")) {
    signOut(auth)
      .then(() => { window.location.href = "../login/login.html"; })
      .catch((err) => { console.error("Logout error:", err); alert("Failed to logout."); });
  }
});