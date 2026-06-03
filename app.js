// =====================================================
// FINANÇAS PESSOAIS - Aplicativo Principal v2
// =====================================================

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STORAGE_KEY = 'financas_app_data';

let state = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  currentPage: 'dashboard',
  filterType: 'all',
  transactions: [],
  recurring: [],
  goals: [],
  editingTransaction: null,
  editingRecurring: null,
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
    state.recurring = parsed.recurring || [];
    state.goals = parsed.goals || [];
  } else {
    state.transactions = [];
    state.recurring = [...DEFAULT_RECURRING];
    state.goals = [...DEFAULT_GOALS];
    saveData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    transactions: state.transactions,
    recurring: state.recurring,
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
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 10);
  return state.transactions
    .filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date + 'T00:00:00');
      return d >= today && d <= endDate && !t.paid;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6);
}

function getOverdueBills() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return state.transactions
    .filter(t => {
      if (t.type !== 'expense' || t.paid) return false;
      const d = new Date(t.date + 'T00:00:00');
      return d < today;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ---- RECURRING: AUTO-GENERATE ----
function generateRecurringForMonth(month, year) {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  let generated = 0;

  state.recurring.forEach(rec => {
    if (!rec.active) return;

    // Check start date
    if (rec.startMonth && rec.startMonth > monthKey) return;
    // Check end date
    if (rec.endMonth && rec.endMonth < monthKey) return;

    // Check if already generated for this month
    const exists = state.transactions.some(t =>
      t.recurringId === rec.id &&
      t.date.startsWith(monthKey)
    );
    if (exists) return;

    const day = Math.min(rec.dueDay, 28);
    state.transactions.push({
      id: generateId(),
      type: rec.type,
      description: rec.description,
      category: rec.category,
      amount: rec.amount,
      date: `${monthKey}-${String(day).padStart(2, '0')}`,
      dueDay: rec.dueDay,
      recurring: true,
      recurringId: rec.id,
      responsible: rec.responsible || '',
      paid: false,
    });
    generated++;
  });

  if (generated > 0) {
    saveData();
  }
  return generated;
}

function generateCurrentMonth() {
  const count = generateRecurringForMonth(state.currentMonth, state.currentYear);
  if (count > 0) {
    showToast(`${count} lançamento(s) gerado(s) para ${MONTHS[state.currentMonth]}`);
    navigateTo(state.currentPage);
  } else {
    showToast('Lançamentos já existem para este mês');
  }
}

// ---- RENDER: DASHBOARD ----
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
  const labels = [], incomeData = [], expenseData = [];
  for (let i = 0; i < 6; i++) {
    let m = state.currentMonth - 5 + i;
    let y = state.currentYear;
    if (m < 0) { m += 12; y--; }
    const s = getMonthSummary(m, y);
    labels.push(MONTHS[m].substr(0, 3));
    incomeData.push(s.income);
    expenseData.push(s.expense);
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
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: '600' } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
        y: { grid: { color: '#F0F0F0' }, ticks: { font: { size: 10 }, callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v } }
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
    pieChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['#E0E0E0'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    return;
  }
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: expenses.map(e => e.name), datasets: [{ data: expenses.map(e => e.amount), backgroundColor: expenses.map(e => e.color), borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 10, font: { size: 10, weight: '600' } } },
        tooltip: { callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a, b) => a + b, 0); return `${ctx.label}: ${formatCurrency(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`; } } }
      }
    }
  });
}

function renderAlerts() {
  const container = document.getElementById('alerts-container');
  const overdue = getOverdueBills().map(b => ({ ...b, status: 'overdue' }));
  const upcoming = getUpcomingBills().map(b => ({ ...b, status: 'upcoming' }));
  const all = [...overdue, ...upcoming];
  if (all.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check-circle"></i><p>Nenhuma conta pendente nos próximos dias</p></div>';
    return;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  container.innerHTML = all.slice(0, 6).map(bill => {
    const d = new Date(bill.date + 'T00:00:00');
    const isToday = d.getTime() === today.getTime();
    const isOverdue = d < today;
    const statusClass = isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming';
    const statusIcon = isOverdue ? 'fa-exclamation' : isToday ? 'fa-bell' : 'fa-clock';
    const dateLabel = isOverdue ? `Venceu ${formatDate(bill.date)}` : isToday ? 'Vence hoje!' : `Vence ${formatDate(bill.date)}`;
    return `<div class="alert-item" onclick="openEditTransaction('${bill.id}')">
        <div class="alert-icon ${statusClass}"><i class="fa-solid ${statusIcon}"></i></div>
        <div class="alert-info"><div class="alert-name">${bill.description}</div><div class="alert-date">${dateLabel}</div></div>
        <div class="alert-amount">${formatCurrency(bill.amount)}</div></div>`;
  }).join('');
}

function renderCategoryBreakdown() {
  const container = document.getElementById('category-breakdown');
  if (!container) return;
  const expenses = getExpensesByCategory(state.currentMonth, state.currentYear);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  if (expenses.length === 0) { container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:16px;">Sem despesas neste mês</p>'; return; }
  container.innerHTML = expenses.map(e => {
    const pct = total > 0 ? ((e.amount / total) * 100).toFixed(1) : 0;
    return `<div class="report-row"><div class="cat-info"><div class="cat-dot" style="background:${e.color}"></div><div class="cat-name">${e.name}</div></div><div class="cat-value">${formatCurrency(e.amount)} <small style="color:var(--text-secondary)">(${pct}%)</small></div></div>`;
  }).join('');
}

// ---- RENDER: TRANSACTIONS ----
function renderTransactions() {
  const container = document.getElementById('transactions-list');
  let txs = getMonthTransactions(state.currentMonth, state.currentYear);
  if (state.filterType === 'income') txs = txs.filter(t => t.type === 'income');
  else if (state.filterType === 'expense') txs = txs.filter(t => t.type === 'expense');
  txs.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (txs.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Nenhuma transação neste mês</p></div>'; return; }
  const grouped = {};
  txs.forEach(t => { const key = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }); if (!grouped[key]) grouped[key] = []; grouped[key].push(t); });
  let html = '';
  for (const [date, items] of Object.entries(grouped)) {
    html += `<div class="transaction-group-header">${date}</div>`;
    items.forEach(t => {
      const cat = getCategoryInfo(t.category, t.type);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tDate = new Date(t.date + 'T00:00:00');
      let statusClass = t.paid ? 'paid' : tDate < today ? 'overdue' : 'pending';
      html += `<div class="transaction-item" onclick="openEditTransaction('${t.id}')">
          <div class="transaction-status ${statusClass}"></div>
          <div class="transaction-icon" style="background:${cat.color}"><i class="fa-solid ${cat.icon}"></i></div>
          <div class="transaction-details"><div class="tx-name">${t.description}</div><div class="tx-category">${cat.name}${t.responsible ? ' - ' + t.responsible : ''}</div></div>
          <div class="transaction-amount"><div class="amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}</div><div class="tx-date">${formatDate(t.date)}</div></div></div>`;
    });
  }
  container.innerHTML = html;
}

// ---- RENDER: RECURRING ----
function renderRecurring() {
  const container = document.getElementById('recurring-list');
  if (state.recurring.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-repeat"></i><p>Nenhum lançamento recorrente cadastrado.<br>Adicione receitas e despesas fixas!</p></div>';
    return;
  }

  const incomes = state.recurring.filter(r => r.type === 'income' && r.active);
  const expenses = state.recurring.filter(r => r.type === 'expense' && r.active);
  const totalInc = incomes.reduce((s, r) => s + r.amount, 0);
  const totalExp = expenses.reduce((s, r) => s + r.amount, 0);

  let html = '';

  // Summary
  html += `<div class="recurring-summary">
    <div class="rec-sum-item income"><span>Receitas fixas</span><strong>${formatCurrency(totalInc)}</strong></div>
    <div class="rec-sum-item expense"><span>Despesas fixas</span><strong>${formatCurrency(totalExp)}</strong></div>
    <div class="rec-sum-item ${totalInc - totalExp >= 0 ? 'positive' : 'negative'}"><span>Saldo previsto</span><strong>${formatCurrency(totalInc - totalExp)}</strong></div>
  </div>`;

  if (incomes.length > 0) {
    html += '<div class="rec-section-title"><i class="fa-solid fa-arrow-up" style="color:var(--income)"></i> Receitas Recorrentes</div>';
    incomes.forEach(r => { html += renderRecurringItem(r); });
  }

  if (expenses.length > 0) {
    html += '<div class="rec-section-title"><i class="fa-solid fa-arrow-down" style="color:var(--expense)"></i> Despesas Recorrentes</div>';
    expenses.forEach(r => { html += renderRecurringItem(r); });
  }

  container.innerHTML = html;
}

function renderRecurringItem(r) {
  const cat = getCategoryInfo(r.category, r.type);
  return `<div class="transaction-item" onclick="openEditRecurring('${r.id}')">
    <div class="transaction-icon" style="background:${cat.color}"><i class="fa-solid ${cat.icon}"></i></div>
    <div class="transaction-details">
      <div class="tx-name">${r.description}</div>
      <div class="tx-category">${cat.name} - Dia ${r.dueDay}${r.responsible ? ' - ' + r.responsible : ''}</div>
    </div>
    <div class="transaction-amount">
      <div class="amount ${r.type}">${r.type === 'income' ? '+' : '-'} ${formatCurrency(r.amount)}</div>
    </div>
  </div>`;
}

// ---- RENDER: GOALS ----
function renderGoals() {
  const container = document.getElementById('goals-list');
  if (state.goals.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullseye"></i><p>Nenhuma meta criada</p></div>'; return; }
  container.innerHTML = state.goals.map(g => {
    const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
    const deadline = g.deadline ? new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '';
    return `<div class="goal-card" onclick="openEditGoal('${g.id}')">
        <div class="goal-header"><div class="goal-icon" style="background:${g.color}"><i class="fa-solid ${g.icon}"></i></div>
        <div class="goal-info"><h4>${g.name}</h4><div class="goal-deadline">${deadline ? 'Meta: ' + deadline : ''}</div></div></div>
        <div class="goal-amounts"><span class="current">${formatCurrency(g.currentAmount)}</span><span class="target">de ${formatCurrency(g.targetAmount)}</span></div>
        <div class="goal-progress-bar"><div class="fill" style="width:${pct}%;background:${g.color}"></div></div>
        <div class="goal-percentage" style="color:${g.color}">${pct.toFixed(1)}%</div></div>`;
  }).join('');
}

// ---- RENDER: REPORTS ----
function renderReports() {
  const c1 = document.getElementById('year-summary');
  const c2 = document.getElementById('month-comparison');
  if (!c1 || !c2) return;

  let totalIncome = 0, totalExpense = 0;
  for (let m = 0; m < 12; m++) { const s = getMonthSummary(m, state.currentYear); totalIncome += s.income; totalExpense += s.expense; }
  c1.innerHTML = `
    <div class="report-row"><div class="cat-info"><div class="cat-dot" style="background:var(--income)"></div><div class="cat-name">Total Receitas ${state.currentYear}</div></div><div class="cat-value" style="color:var(--income)">${formatCurrency(totalIncome)}</div></div>
    <div class="report-row"><div class="cat-info"><div class="cat-dot" style="background:var(--expense)"></div><div class="cat-name">Total Despesas ${state.currentYear}</div></div><div class="cat-value" style="color:var(--expense)">${formatCurrency(totalExpense)}</div></div>
    <div class="report-row"><div class="cat-info"><div class="cat-dot" style="background:var(--primary)"></div><div class="cat-name">Saldo do Ano</div></div><div class="cat-value" style="color:var(--primary)">${formatCurrency(totalIncome - totalExpense)}</div></div>`;

  let html = '';
  for (let m = 0; m < 12; m++) {
    const s = getMonthSummary(m, state.currentYear);
    if (s.income === 0 && s.expense === 0) continue;
    const pos = s.balance >= 0;
    html += `<div class="report-row"><div class="cat-info"><div class="cat-dot" style="background:${pos ? 'var(--income)' : 'var(--expense)'}"></div><div class="cat-name">${MONTHS[m]}</div></div><div class="cat-value" style="color:${pos ? 'var(--income)' : 'var(--expense)'}">${formatCurrency(s.balance)}</div></div>`;
  }
  c2.innerHTML = html || '<p style="text-align:center;color:var(--text-secondary);padding:16px;">Sem dados para este ano</p>';
}

// ---- NAVIGATION ----
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');
  document.getElementById('month-label').textContent = `${MONTHS[state.currentMonth]} ${state.currentYear}`;

  const { income, expense, balance } = getMonthSummary(state.currentMonth, state.currentYear);
  document.getElementById('income-value').textContent = formatCurrency(income);
  document.getElementById('expense-value').textContent = formatCurrency(expense);
  document.getElementById('balance-value').textContent = formatCurrency(balance);

  if (page === 'dashboard') renderDashboard();
  else if (page === 'transactions') renderTransactions();
  else if (page === 'recurring') renderRecurring();
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
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; state.editingTransaction = null; state.editingRecurring = null; state.editingGoal = null; }

// ---- TRANSACTION MODAL ----
function openAddTransaction() {
  state.editingTransaction = null;
  document.getElementById('modal-title').textContent = 'Nova Transação';
  document.getElementById('btn-delete-tx').style.display = 'none';
  document.getElementById('tx-type').value = 'expense';
  updateTypeToggle('expense');
  document.getElementById('tx-description').value = '';
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-date').value = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  document.getElementById('tx-responsible').value = '';
  document.getElementById('tx-paid').checked = false;
  selectCategory(null);
  openModal('transaction-modal');
}

function openEditTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  state.editingTransaction = tx;
  document.getElementById('modal-title').textContent = 'Editar Transação';
  document.getElementById('btn-delete-tx').style.display = 'block';
  document.getElementById('tx-type').value = tx.type;
  updateTypeToggle(tx.type);
  document.getElementById('tx-description').value = tx.description;
  document.getElementById('tx-amount').value = tx.amount;
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-responsible').value = tx.responsible || '';
  document.getElementById('tx-paid').checked = tx.paid || false;
  selectCategory(tx.category);
  openModal('transaction-modal');
}

function updateTypeToggle(type) {
  document.getElementById('tx-type').value = type;
  document.getElementById('btn-type-income').className = type === 'income' ? 'active-income' : '';
  document.getElementById('btn-type-expense').className = type === 'expense' ? 'active-expense' : '';
  renderCategorySelector('tx', type);
}

function renderCategorySelector(prefix, type) {
  const container = document.getElementById(prefix + '-category-selector');
  const cats = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
  container.innerHTML = cats.map(c => `<div class="category-chip" data-cat="${c.id}" onclick="selectCategory('${c.id}')"><i class="fa-solid ${c.icon}" style="color:${c.color}"></i><span>${c.name}</span></div>`).join('');
}

function selectCategory(catId) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('selected'));
  if (catId) { const el = document.querySelector(`.category-chip[data-cat="${catId}"]`); if (el) el.classList.add('selected'); }
  const txCat = document.getElementById('tx-category');
  const recCat = document.getElementById('rec-category');
  if (txCat) txCat.value = catId || '';
  if (recCat) recCat.value = catId || '';
}

function saveTransaction() {
  const type = document.getElementById('tx-type').value;
  const description = document.getElementById('tx-description').value.trim();
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const date = document.getElementById('tx-date').value;
  const category = document.getElementById('tx-category').value;
  const responsible = document.getElementById('tx-responsible').value.trim();
  const paid = document.getElementById('tx-paid').checked;
  if (!description || !amount || !date || !category) { showToast('Preencha todos os campos obrigatórios'); return; }

  if (state.editingTransaction) {
    Object.assign(state.editingTransaction, { type, description, amount, date, category, responsible, paid, dueDay: new Date(date + 'T00:00:00').getDate() });
    showToast('Transação atualizada!');
  } else {
    state.transactions.push({ id: generateId(), type, description, amount, date, category, responsible, paid, dueDay: new Date(date + 'T00:00:00').getDate(), recurring: false });
    showToast('Transação adicionada!');
  }
  saveData();
  closeModal('transaction-modal');
  navigateTo(state.currentPage);
}

function deleteTransaction() {
  if (!state.editingTransaction) return;
  if (!confirm('Deseja excluir esta transação?')) return;
  state.transactions = state.transactions.filter(t => t.id !== state.editingTransaction.id);
  saveData(); closeModal('transaction-modal'); showToast('Transação excluída'); navigateTo(state.currentPage);
}

// ---- RECURRING MODAL ----
function openAddRecurring() {
  state.editingRecurring = null;
  document.getElementById('rec-modal-title').textContent = 'Novo Lançamento Recorrente';
  document.getElementById('btn-delete-rec').style.display = 'none';
  document.getElementById('rec-type').value = 'expense';
  updateRecTypeToggle('expense');
  document.getElementById('rec-description').value = '';
  document.getElementById('rec-amount').value = '';
  document.getElementById('rec-due-day').value = '1';
  document.getElementById('rec-responsible').value = '';
  document.getElementById('rec-end-month').value = '';
  selectCategory(null);
  openModal('recurring-modal');
}

function openEditRecurring(id) {
  const rec = state.recurring.find(r => r.id === id);
  if (!rec) return;
  state.editingRecurring = rec;
  document.getElementById('rec-modal-title').textContent = 'Editar Recorrente';
  document.getElementById('btn-delete-rec').style.display = 'block';
  document.getElementById('rec-type').value = rec.type;
  updateRecTypeToggle(rec.type);
  document.getElementById('rec-description').value = rec.description;
  document.getElementById('rec-amount').value = rec.amount;
  document.getElementById('rec-due-day').value = rec.dueDay;
  document.getElementById('rec-responsible').value = rec.responsible || '';
  document.getElementById('rec-end-month').value = rec.endMonth || '';
  selectCategory(rec.category);
  openModal('recurring-modal');
}

function updateRecTypeToggle(type) {
  document.getElementById('rec-type').value = type;
  document.getElementById('btn-rec-type-income').className = type === 'income' ? 'active-income' : '';
  document.getElementById('btn-rec-type-expense').className = type === 'expense' ? 'active-expense' : '';
  renderCategorySelector('rec', type);
}

function saveRecurring() {
  const type = document.getElementById('rec-type').value;
  const description = document.getElementById('rec-description').value.trim();
  const amount = parseFloat(document.getElementById('rec-amount').value);
  const dueDay = parseInt(document.getElementById('rec-due-day').value) || 1;
  const category = document.getElementById('rec-category').value;
  const responsible = document.getElementById('rec-responsible').value.trim();
  const endMonth = document.getElementById('rec-end-month').value || '';

  if (!description || !amount || !category) { showToast('Preencha todos os campos obrigatórios'); return; }

  const now = new Date();
  const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (state.editingRecurring) {
    const recId = state.editingRecurring.id;
    Object.assign(state.editingRecurring, { type, description, amount, dueDay, category, responsible, endMonth });

    // Propagar alterações para transações já geradas (não pagas)
    let updated = 0;
    state.transactions.forEach(t => {
      if (t.recurringId === recId && !t.paid) {
        t.type = type;
        t.description = description;
        t.amount = amount;
        t.category = category;
        t.responsible = responsible;
        // Atualizar dia no date
        const parts = t.date.split('-');
        parts[2] = String(Math.min(dueDay, 28)).padStart(2, '0');
        t.date = parts.join('-');
        t.dueDay = dueDay;
        updated++;
      }
    });

    showToast(`Recorrente atualizado! ${updated > 0 ? updated + ' transação(ões) pendente(s) atualizada(s)' : ''}`);
  } else {
    state.recurring.push({ id: generateId(), type, description, amount, dueDay, category, responsible, active: true, startMonth, endMonth });
    showToast('Recorrente criado!');
  }
  saveData();
  closeModal('recurring-modal');
  navigateTo(state.currentPage);
}

function deleteRecurring() {
  if (!state.editingRecurring) return;
  if (!confirm('Excluir este recorrente e suas transações pendentes?')) return;
  const recId = state.editingRecurring.id;
  state.recurring = state.recurring.filter(r => r.id !== recId);
  // Remover transações pendentes geradas por este recorrente
  state.transactions = state.transactions.filter(t => !(t.recurringId === recId && !t.paid));
  saveData(); closeModal('recurring-modal'); showToast('Recorrente e transações pendentes excluídos'); navigateTo(state.currentPage);
}

// ---- GOAL MODAL ----
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
  if (!name || !targetAmount) { showToast('Preencha nome e valor da meta'); return; }
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
  const icons = ['fa-piggy-bank', '#fa-bullseye', 'fa-star', 'fa-flag', 'fa-trophy'];
  if (state.editingGoal) { Object.assign(state.editingGoal, { name, targetAmount, currentAmount, deadline }); showToast('Meta atualizada!'); }
  else { state.goals.push({ id: generateId(), name, targetAmount, currentAmount, deadline, color: colors[state.goals.length % colors.length], icon: icons[state.goals.length % icons.length] }); showToast('Meta criada!'); }
  saveData(); closeModal('goal-modal'); renderGoals();
}

function deleteGoal() {
  if (!state.editingGoal) return;
  if (!confirm('Excluir esta meta?')) return;
  state.goals = state.goals.filter(g => g.id !== state.editingGoal.id);
  saveData(); closeModal('goal-modal'); showToast('Meta excluída'); renderGoals();
}

// ---- UTILS ----
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

function clearAllData() {
  if (!confirm('Isso vai APAGAR todas as transações, recorrentes e metas. Começar do zero?')) return;
  state.transactions = [];
  state.recurring = [];
  state.goals = [];
  saveData(); navigateTo('dashboard'); showToast('Tudo limpo!');
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  navigateTo('dashboard');
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => { btn.addEventListener('click', () => navigateTo(btn.dataset.page)); });
  document.querySelectorAll('.filter-chip').forEach(chip => { chip.addEventListener('click', () => setFilter(chip.dataset.filter)); });
  renderCategorySelector('tx', 'expense');
});
