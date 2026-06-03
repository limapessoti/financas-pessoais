// =====================================================
// FINANÇAS PESSOAIS - Aplicativo Principal
// =====================================================

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STORAGE_KEY = 'financas_app_data';

let state = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  currentPage: 'dashboard',
  filterType: 'all',
  transactions: [],
  goals: [],
  editingTransaction: null,
  editingGoal: null,
};

let barChart = null;
let pieChart = null;

// ---- PERSISTENCE ----
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    state.transactions = parsed.transactions || [];
    state.goals = parsed.goals || [];
  } else {
    state.transactions = buildInitialTransactions();
    state.goals = [...DEFAULT_GOALS];
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    transactions: state.transactions,
    goals: state.goals,
  }));
}

// ---- FORMATTERS ----
function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getCategoryInfo(catId, type) {
  const list = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
  return list.find(c => c.id === catId) || { name: 'Outros', icon: 'fa-circle', color: '#9E9E9E' };
}

// ---- CALCULATIONS ----
function getMonthTransactions(month, year) {
  return state.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function getMonthSummary(month, year) {
  const txs = getMonthTransactions(month, year);
  let income = 0, expense = 0;
  txs.forEach(t => {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  });
  return { income, expense, balance: income - expense };
}

function getExpensesByCategory(month, year) {
  const txs = getMonthTransactions(month, year).filter(t => t.type === 'expense');
  const grouped = {};
  txs.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = 0;
    grouped[t.category] += t.amount;
  });
  return Object.entries(grouped)
    .map(([catId, amount]) => ({ ...getCategoryInfo(catId, 'expense'), amount }))
    .sort((a, b) => b.amount - a.amount);
}

function getUpcomingBills() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 10);

  return state.transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date + 'T00:00:00');
      return d >= today && d <= endDate && !t.paid;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);
}

function getOverdueBills() {
  const today = new Date();
  today.setHours(0,0,0,0);
  return state.transactions
    .filter(t => {
      if (t.type !== 'expense' || t.paid) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d < today;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ---- RENDER FUNCTIONS ----
function renderDashboard() {
  const { income, expense, balance } = getMonthSummary(state.currentMonth, state.currentYear);

  document.getElementById('income-value').textContent = formatCurrency(income);
  document.getElementById('expense-value').textContent = formatCurrency(expense);
  document.getElementById('balance-value').textContent = formatCurrency(balance);
  document.getElementById('month-label').textContent = `${MONTHS[state.currentMonth]} ${state.currentYear}`;

  renderBarChart();
  renderPieChart();
  renderAlerts();
  renderCategoryBreakdown();
}

function renderBarChart() {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;

  const labels = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 0; i < 6; i++) {
    let m = state.currentMonth - 5 + i;
    let y = state.currentYear;
    if (m < 0) { m += 12; y--; }
    const summary = getMonthSummary(m, y);
    labels.push(MONTHS[m].substr(0, 3));
    incomeData.push(summary.income);
    expenseData.push(summary.expense);
  }

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Receitas', data: incomeData, backgroundColor: '#66BB6A', borderRadius: 6, barPercentage: 0.35 },
        { label: 'Despesas', data: expenseData, backgroundColor: '#EF5350', borderRadius: 6, barPercentage: 0.35 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: '600' } } },
        tooltip: {
          callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
        y: {
          grid: { color: '#F0F0F0' },
          ticks: {
            font: { size: 10 },
            callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v
          }
        }
      }
    }
  });
}

function renderPieChart() {
  const ctx = document.getElementById('pieChart');
  if (!ctx) return;

  const expenses = getExpensesByCategory(state.currentMonth, state.currentYear);

  if (pieChart) pieChart.destroy();

  if (expenses.length === 0) {
    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#E0E0E0'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    return;
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: expenses.map(e => e.name),
      datasets: [{
        data: expenses.map(e => e.amount),
        backgroundColor: expenses.map(e => e.color),
        borderWidth: 2,
        borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10, weight: '600' } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderAlerts() {
  const container = document.getElementById('alerts-container');
  const overdue = getOverdueBills();
  const upcoming = getUpcomingBills();
  const all = [...overdue.map(b => ({...b, status: 'overdue'})), ...upcoming.map(b => ({...b, status: 'upcoming'}))];

  if (all.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-circle"></i><p>Nenhuma conta pendente nos próximos dias</p></div>';
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  container.innerHTML = all.slice(0, 6).map(bill => {
    const d = new Date(bill.date + 'T00:00:00');
    const isToday = d.getTime() === today.getTime();
    const isOverdue = d < today;
    const statusClass = isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming';
    const statusIcon = isOverdue ? 'fa-exclamation' : isToday ? 'fa-bell' : 'fa-clock';
    const dateLabel = isOverdue ? `Venceu ${formatDate(bill.date)}` : isToday ? 'Vence hoje!' : `Vence ${formatDate(bill.date)}`;

    return `
      <div class="alert-item" onclick="openEditTransaction('${bill.id}')">
        <div class="alert-icon ${statusClass}"><i class="fa-solid ${statusIcon}"></i></div>
        <div class="alert-info">
          <div class="alert-name">${bill.description}</div>
          <div class="alert-date">${dateLabel}</div>
        </div>
        <div class="alert-amount">${formatCurrency(bill.amount)}</div>
      </div>
    `;
  }).join('');
}

function renderCategoryBreakdown() {
  const container = document.getElementById('category-breakdown');
  if (!container) return;
  const expenses = getExpensesByCategory(state.currentMonth, state.currentYear);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (expenses.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:16px;">Sem despesas neste mês</p>';
    return;
  }

  container.innerHTML = expenses.map(e => {
    const pct = total > 0 ? ((e.amount / total) * 100).toFixed(1) : 0;
    return `
      <div class="report-row">
        <div class="cat-info">
          <div class="cat-dot" style="background:${e.color}"></div>
          <div class="cat-name">${e.name}</div>
        </div>
        <div class="cat-value">${formatCurrency(e.amount)} <small style="color:var(--text-secondary)">(${pct}%)</small></div>
      </div>
    `;
  }).join('');
}

// ---- TRANSACTIONS PAGE ----
function renderTransactions() {
  const container = document.getElementById('transactions-list');
  let txs = getMonthTransactions(state.currentMonth, state.currentYear);

  if (state.filterType === 'income') txs = txs.filter(t => t.type === 'income');
  else if (state.filterType === 'expense') txs = txs.filter(t => t.type === 'expense');

  txs.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (txs.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Nenhuma transação neste mês</p></div>';
    return;
  }

  const grouped = {};
  txs.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  let html = '';
  for (const [date, items] of Object.entries(grouped)) {
    html += `<div class="transaction-group-header">${date}</div>`;
    items.forEach(t => {
      const cat = getCategoryInfo(t.category, t.type);
      const today = new Date(); today.setHours(0,0,0,0);
      const tDate = new Date(t.date + 'T00:00:00');
      let statusClass = t.paid ? 'paid' : tDate < today ? 'overdue' : 'pending';

      html += `
        <div class="transaction-item" onclick="openEditTransaction('${t.id}')">
          <div class="transaction-status ${statusClass}"></div>
          <div class="transaction-icon" style="background:${cat.color}">
            <i class="fa-solid ${cat.icon}"></i>
          </div>
          <div class="transaction-details">
            <div class="tx-name">${t.description}</div>
            <div class="tx-category">${cat.name}${t.responsible ? ' - ' + t.responsible : ''}</div>
          </div>
          <div class="transaction-amount">
            <div class="amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</div>
            <div class="tx-date">${formatDate(t.date)}</div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

// ---- GOALS PAGE ----
function renderGoals() {
  const container = document.getElementById('goals-list');

  if (state.goals.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullseye"></i><p>Nenhuma meta criada ainda</p></div>';
    return;
  }

  container.innerHTML = state.goals.map(g => {
    const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
    const deadline = g.deadline ? new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '';
    return `
      <div class="goal-card" onclick="openEditGoal('${g.id}')">
        <div class="goal-header">
          <div class="goal-icon" style="background:${g.color}"><i class="fa-solid ${g.icon}"></i></div>
          <div class="goal-info">
            <h4>${g.name}</h4>
            <div class="goal-deadline">${deadline ? 'Meta: ' + deadline : ''}</div>
          </div>
        </div>
        <div class="goal-amounts">
          <span class="current">${formatCurrency(g.currentAmount)}</span>
          <span class="target">de ${formatCurrency(g.targetAmount)}</span>
        </div>
        <div class="goal-progress-bar">
          <div class="fill" style="width:${pct}%;background:${g.color}"></div>
        </div>
        <div class="goal-percentage" style="color:${g.color}">${pct.toFixed(1)}%</div>
      </div>
    `;
  }).join('');
}

// ---- REPORTS PAGE ----
function renderReports() {
  renderYearSummary();
  renderMonthComparison();
}

function renderYearSummary() {
  const container = document.getElementById('year-summary');
  if (!container) return;

  let totalIncome = 0, totalExpense = 0;
  for (let m = 0; m < 12; m++) {
    const s = getMonthSummary(m, state.currentYear);
    totalIncome += s.income;
    totalExpense += s.expense;
  }

  container.innerHTML = `
    <div class="report-row">
      <div class="cat-info"><div class="cat-dot" style="background:var(--income)"></div><div class="cat-name">Total Receitas ${state.currentYear}</div></div>
      <div class="cat-value" style="color:var(--income)">${formatCurrency(totalIncome)}</div>
    </div>
    <div class="report-row">
      <div class="cat-info"><div class="cat-dot" style="background:var(--expense)"></div><div class="cat-name">Total Despesas ${state.currentYear}</div></div>
      <div class="cat-value" style="color:var(--expense)">${formatCurrency(totalExpense)}</div>
    </div>
    <div class="report-row">
      <div class="cat-info"><div class="cat-dot" style="background:var(--primary)"></div><div class="cat-name">Saldo do Ano</div></div>
      <div class="cat-value" style="color:var(--primary)">${formatCurrency(totalIncome - totalExpense)}</div>
    </div>
  `;
}

function renderMonthComparison() {
  const container = document.getElementById('month-comparison');
  if (!container) return;

  let html = '';
  for (let m = 0; m < 12; m++) {
    const s = getMonthSummary(m, state.currentYear);
    if (s.income === 0 && s.expense === 0) continue;
    const isPositive = s.balance >= 0;
    html += `
      <div class="report-row">
        <div class="cat-info">
          <div class="cat-dot" style="background:${isPositive ? 'var(--income)' : 'var(--expense)'}"></div>
          <div class="cat-name">${MONTHS[m]}</div>
        </div>
        <div class="cat-value" style="color:${isPositive ? 'var(--income)' : 'var(--expense)'}">
          ${formatCurrency(s.balance)}
        </div>
      </div>
    `;
  }

  container.innerHTML = html || '<p style="text-align:center;color:var(--text-secondary);padding:16px;">Sem dados para este ano</p>';
}

// ---- NAVIGATION ----
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (page === 'dashboard') renderDashboard();
  else if (page === 'transactions') renderTransactions();
  else if (page === 'goals') renderGoals();
  else if (page === 'reports') renderReports();
}

function changeMonth(delta) {
  state.currentMonth += delta;
  if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
  if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
  navigateTo(state.currentPage);
}

function setFilter(type) {
  state.filterType = type;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  document.querySelector(`.filter-chip[data-filter="${type}"]`).classList.add('active');
  renderTransactions();
}

// ---- MODALS ----
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
  state.editingTransaction = null;
  state.editingGoal = null;
}

function openAddTransaction() {
  state.editingTransaction = null;
  document.getElementById('modal-title').textContent = 'Nova Transação';
  document.getElementById('btn-delete-tx').style.display = 'none';
  resetTransactionForm();
  openModal('transaction-modal');
}

function openEditTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  state.editingTransaction = tx;
  document.getElementById('modal-title').textContent = 'Editar Transação';
  document.getElementById('btn-delete-tx').style.display = 'block';
  fillTransactionForm(tx);
  openModal('transaction-modal');
}

function resetTransactionForm() {
  document.getElementById('tx-type').value = 'expense';
  updateTypeToggle('expense');
  document.getElementById('tx-description').value = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-date').value = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  document.getElementById('tx-responsible').value = '';
  document.getElementById('tx-recurring').checked = false;
  document.getElementById('tx-paid').checked = false;
  selectCategory(null);
}

function fillTransactionForm(tx) {
  document.getElementById('tx-type').value = tx.type;
  updateTypeToggle(tx.type);
  document.getElementById('tx-description').value = tx.description;
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-responsible').value = tx.responsible || '';
  document.getElementById('tx-recurring').checked = tx.recurring || false;
  document.getElementById('tx-paid').checked = tx.paid || false;
  selectCategory(tx.category);
}

function updateTypeToggle(type) {
  document.getElementById('tx-type').value = type;
  const incomeBtn = document.getElementById('btn-type-income');
  const expenseBtn = document.getElementById('btn-type-expense');

  incomeBtn.className = type === 'income' ? 'active-income' : '';
  expenseBtn.className = type === 'expense' ? 'active-expense' : '';

  renderCategorySelector(type);
}

function renderCategorySelector(type) {
  const container = document.getElementById('category-selector');
  const cats = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;

  container.innerHTML = cats.map(c => `
    <div class="category-chip" data-cat="${c.id}" onclick="selectCategory('${c.id}')">
      <i class="fa-solid ${c.icon}" style="color:${c.color}"></i>
      <span>${c.name}</span>
    </div>
  `).join('');
}

function selectCategory(catId) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('selected'));
  if (catId) {
    const el = document.querySelector(`.category-chip[data-cat="${catId}"]`);
    if (el) el.classList.add('selected');
  }
  document.getElementById('tx-category').value = catId || '';
}

function saveTransaction() {
  const type = document.getElementById('tx-type').value;
  const description = document.getElementById('tx-description').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  const category = document.getElementById('tx-category').value;
  const responsible = document.getElementById('tx-responsible').value.trim();
  const recurring = document.getElementById('tx-recurring').checked;
  const paid = document.getElementById('tx-paid').checked;

  if (!description || !amount || !date || !category) {
    showToast('Preencha todos os campos obrigatórios');
    return;
  }

  const dueDay = new Date(date + 'T00:00:00').getDate();

  if (state.editingTransaction) {
    Object.assign(state.editingTransaction, { type, description, amount, date, category, responsible, recurring, paid, dueDay });
    showToast('Transação atualizada!');
  } else {
    state.transactions.push({ id: generateId(), type, description, amount, date, category, responsible, recurring, paid, dueDay });
    showToast('Transação adicionada!');
  }

  saveData();
  closeModal('transaction-modal');
  navigateTo(state.currentPage);
}

function deleteTransaction() {
  if (!state.editingTransaction) return;
  if (!confirm('Deseja realmente excluir esta transação?')) return;
  state.transactions = state.transactions.filter(t => t.id !== state.editingTransaction.id);
  saveData();
  closeModal('transaction-modal');
  showToast('Transação excluída');
  navigateTo(state.currentPage);
}

// ---- GOALS MODAL ----
function openAddGoal() {
  state.editingGoal = null;
  document.getElementById('goal-modal-title').textContent = 'Nova Meta';
  document.getElementById('btn-delete-goal').style.display = 'none';
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-current').value = '0';
  document.getElementById('goal-deadline').value = '';
  openModal('goal-modal');
}

function openEditGoal(id) {
  const g = state.goals.find(g => g.id === id);
  if (!g) return;
  state.editingGoal = g;
  document.getElementById('goal-modal-title').textContent = 'Editar Meta';
  document.getElementById('btn-delete-goal').style.display = 'block';
  document.getElementById('goal-name').value = g.name;
  document.getElementById('goal-target').value = g.targetAmount;
  document.getElementById('goal-current').value = g.currentAmount;
  document.getElementById('goal-deadline').value = g.deadline || '';
  openModal('goal-modal');
}

function saveGoal() {
  const name = document.getElementById('goal-name').value.trim();
  const targetAmount = parseFloat(document.getElementById('goal-target').value);
  const currentAmount = parseFloat(document.getElementById('goal-current').value) || 0;
  const deadline = document.getElementById('goal-deadline').value;

  if (!name || !targetAmount) {
    showToast('Preencha nome e valor da meta');
    return;
  }

  const colors = ['#4CAF50','#2196F3','#FF9800','#E91E63','#9C27B0','#00BCD4'];
  const icons = ['fa-piggy-bank','fa-bullseye','fa-star','fa-flag','fa-trophy'];

  if (state.editingGoal) {
    Object.assign(state.editingGoal, { name, targetAmount, currentAmount, deadline });
    showToast('Meta atualizada!');
  } else {
    state.goals.push({
      id: generateId(),
      name, targetAmount, currentAmount, deadline,
      color: colors[state.goals.length % colors.length],
      icon: icons[state.goals.length % icons.length],
    });
    showToast('Meta criada!');
  }

  saveData();
  closeModal('goal-modal');
  renderGoals();
}

function deleteGoal() {
  if (!state.editingGoal) return;
  if (!confirm('Deseja realmente excluir esta meta?')) return;
  state.goals = state.goals.filter(g => g.id !== state.editingGoal.id);
  saveData();
  closeModal('goal-modal');
  showToast('Meta excluída');
  renderGoals();
}

// ---- TOAST ----
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

// ---- RESET DATA ----
function resetAllData() {
  if (!confirm('Isso vai restaurar todos os dados originais da planilha. Continuar?')) return;
  localStorage.removeItem(STORAGE_KEY);
  loadData();
  navigateTo('dashboard');
  showToast('Dados restaurados!');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  navigateTo('dashboard');

  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => setFilter(chip.dataset.filter));
  });

  renderCategorySelector('expense');
});
