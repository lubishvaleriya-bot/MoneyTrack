function formatCurrency(amount) {
  const numeric = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  return `${formatted} ₴`;
}

function formatSignedCurrency(signedAmount) {
  const numeric = Number.isFinite(Number(signedAmount)) ? Number(signedAmount) : 0;
  const sign = numeric >= 0 ? '+' : '-';
  const formatted = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));
  return `${sign}${formatted} ₴`;
}

export class Dashboard {
  #root;
  #handlers;
  #cashflowChart;
  #categoryChart;
  #categories;

  constructor(rootElement, handlers = {}) {
    if (!(rootElement instanceof HTMLElement)) {
      throw new Error('Dashboard очікує коректний DOM-елемент кореня.');
    }

    this.#root = rootElement;
    this.#handlers = handlers;
    this.#cashflowChart = null;
    this.#categoryChart = null;
    this.#categories = [];

    this.#bindEvents();
  }

  #el(id) {
    return document.getElementById(id);
  }

  #bindEvents() {
    const openModalBtn = this.#el('open-transaction-modal-btn');
    const closeModalBtn = this.#el('close-transaction-modal-btn');
    const cancelModalBtn = this.#el('cancel-transaction-modal-btn');
    const modalBackdrop = this.#el('transaction-modal');
    const txForm = this.#el('transaction-form');
    const txTypeSelect = this.#el('tx-type');
    const budgetForm = this.#el('budget-form');
    const filterType = this.#el('filter-type');
    const filterCategory = this.#el('filter-category');
    const filterDateFrom = this.#el('filter-date-from');
    const filterDateTo = this.#el('filter-date-to');
    const resetFiltersBtn = this.#el('reset-filters-btn');
    const txTbody = this.#el('transactions-tbody');
    const menuToggleBtn = this.#el('mobile-menu-toggle');
    const sidebar = this.#el('sidebar');

    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => this.openTransactionModal());
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeTransactionModal());
    }

    if (cancelModalBtn) {
      cancelModalBtn.addEventListener('click', () => this.closeTransactionModal());
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (event) => {
        if (event.target === modalBackdrop) {
          this.closeTransactionModal();
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeTransactionModal();
        if (sidebar) {
          sidebar.classList.remove('is-open');
        }
      }
    });

    if (menuToggleBtn && sidebar) {
      menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
      });
    }

    if (txTypeSelect) {
      txTypeSelect.addEventListener('change', () => {
        this.#populateTransactionCategoryOptions(txTypeSelect.value);
      });
    }

    if (txForm) {
      txForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.clearTransactionError();

        const formData = {
          type: this.#el('tx-type')?.value ?? '',
          amount: this.#el('tx-amount')?.value ?? '',
          categoryId: this.#el('tx-category')?.value ?? '',
          date: this.#el('tx-date')?.value ?? '',
          note: this.#el('tx-note')?.value ?? '',
        };

        if (typeof this.#handlers.onAddTransaction === 'function') {
          this.#handlers.onAddTransaction(formData);
        }
      });
    }

    if (budgetForm) {
      budgetForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.clearBudgetError();

        const budgetData = {
          limit: this.#el('budget-limit-input')?.value ?? '',
          period: this.#el('budget-period-input')?.value ?? '',
        };

        if (typeof this.#handlers.onUpdateBudget === 'function') {
          this.#handlers.onUpdateBudget(budgetData);
        }
      });
    }

    const emitFilterChange = () => {
      if (typeof this.#handlers.onFilterChange === 'function') {
        this.#handlers.onFilterChange({
          type: filterType?.value ?? 'all',
          categoryId: filterCategory?.value ?? 'all',
          dateFrom: filterDateFrom?.value ?? '',
          dateTo: filterDateTo?.value ?? '',
        });
      }
    };

    filterType?.addEventListener('change', emitFilterChange);
    filterCategory?.addEventListener('change', emitFilterChange);
    filterDateFrom?.addEventListener('change', emitFilterChange);
    filterDateTo?.addEventListener('change', emitFilterChange);

    resetFiltersBtn?.addEventListener('click', () => {
      if (filterType) filterType.value = 'all';
      if (filterCategory) filterCategory.value = 'all';
      if (filterDateFrom) filterDateFrom.value = '';
      if (filterDateTo) filterDateTo.value = '';
      emitFilterChange();
    });

    if (txTbody) {
      txTbody.addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('button[data-tx-id]');
        if (!deleteBtn) {
          return;
        }
        const txId = deleteBtn.getAttribute('data-tx-id');
        if (txId && typeof this.#handlers.onDeleteTransaction === 'function') {
          this.#handlers.onDeleteTransaction(txId);
        }
      });
    }
  }

  openTransactionModal(defaultType = 'expense') {
    const modal = this.#el('transaction-modal');
    const typeSelect = this.#el('tx-type');
    const amountInput = this.#el('tx-amount');
    const dateInput = this.#el('tx-date');
    const noteInput = this.#el('tx-note');

    this.clearTransactionError();

    if (typeSelect) {
      typeSelect.value = defaultType === 'income' ? 'income' : 'expense';
    }

    this.#populateTransactionCategoryOptions(typeSelect?.value ?? 'expense');

    if (amountInput) {
      amountInput.value = '';
    }

    if (dateInput) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    if (noteInput) {
      noteInput.value = '';
    }

    if (modal) {
      modal.classList.remove('is-hidden');
      amountInput?.focus();
    }
  }

  closeTransactionModal() {
    const modal = this.#el('transaction-modal');
    if (modal) {
      modal.classList.add('is-hidden');
    }
    this.clearTransactionError();
  }

  showTransactionError(message) {
    const errorEl = this.#el('form-error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  clearTransactionError() {
    const errorEl = this.#el('form-error');
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  showBudgetError(message) {
    const errorEl = this.#el('budget-error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  clearBudgetError() {
    const errorEl = this.#el('budget-error');
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  #populateTransactionCategoryOptions(txType) {
    const select = this.#el('tx-category');
    if (!select) {
      return;
    }

    const matching = this.#categories.filter((cat) => cat.type === txType);
    select.innerHTML = '';

    if (matching.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Немає категорій для цього типу';
      select.appendChild(opt);
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Оберіть категорію';
    select.appendChild(placeholder);

    for (const cat of matching) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.icon} ${cat.name}`;
      select.appendChild(opt);
    }
  }

  #syncFilterCategoryOptions(categories, selectedCategoryId) {
    const filterSelect = this.#el('filter-category');
    if (!filterSelect) {
      return;
    }

    filterSelect.innerHTML = '<option value="all">Усі категорії</option>';
    for (const cat of categories) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.icon} ${cat.name}`;
      filterSelect.appendChild(opt);
    }

    filterSelect.value = selectedCategoryId || 'all';
  }

  render({
    summary,
    budgetStatus,
    categories = [],
    transactions = [],
    filters = {},
    analytics = {},
  }) {
    this.#categories = Array.isArray(categories) ? categories : [];
    this.#syncFilterCategoryOptions(this.#categories, filters.categoryId);

    this.#renderSummary(summary, budgetStatus, analytics);
    this.#renderBudgetForm(budgetStatus);
    this.#renderTransactions(transactions, this.#categories);
    this.#renderCharts(analytics);
  }

  #renderSummary(summary, budgetStatus, analytics) {
    const balanceEl = this.#el('total-balance');
    const incomeEl = this.#el('total-income');
    const expenseEl = this.#el('total-expense');
    const incomeCountEl = this.#el('income-count');
    const expenseCountEl = this.#el('expense-count');

    const budgetStatusEl = this.#el('budget-status');
    const budgetBarEl = this.#el('budget-progress-bar');
    const budgetDetailsEl = this.#el('budget-details');
    const budgetRemainingEl = this.#el('budget-remaining');
    const topCategoryEl = this.#el('top-expense-category');
    const avgDailyEl = this.#el('avg-daily-expense');

    const balance = summary?.balance ?? 0;
    const totalIncome = summary?.totalIncome ?? 0;
    const totalExpense = summary?.totalExpense ?? 0;

    if (balanceEl) {
      balanceEl.textContent = formatCurrency(balance);
      balanceEl.classList.remove('text-positive', 'text-negative');
      if (balance > 0) balanceEl.classList.add('text-positive');
      if (balance < 0) balanceEl.classList.add('text-negative');
    }

    if (incomeEl) {
      incomeEl.textContent = formatCurrency(totalIncome);
    }

    if (expenseEl) {
      expenseEl.textContent = formatCurrency(totalExpense);
    }

    if (incomeCountEl) {
      const c = summary?.incomeCount ?? 0;
      incomeCountEl.textContent = `${c} ${c === 1 ? 'операція' : 'операцій'}`;
    }

    if (expenseCountEl) {
      const c = summary?.expenseCount ?? 0;
      expenseCountEl.textContent = `${c} ${c === 1 ? 'операція' : 'операцій'}`;
    }

    if (budgetStatusEl && budgetBarEl && budgetDetailsEl) {
      const percentage = budgetStatus?.percentage ?? 0;
      const spent = budgetStatus?.spent ?? 0;
      const limit = budgetStatus?.limit ?? 0;
      const remaining = budgetStatus?.remaining ?? 0;
      const exceeded = Boolean(budgetStatus?.isExceeded);

      budgetStatusEl.textContent = `${percentage}%`;
      budgetBarEl.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
      budgetBarEl.classList.toggle('is-over', exceeded);
      budgetDetailsEl.textContent = `${formatCurrency(spent)} / ${formatCurrency(limit)}`;

      if (budgetRemainingEl) {
        budgetRemainingEl.textContent = exceeded
          ? `Перевищено на ${formatCurrency(Math.abs(remaining))}`
          : formatCurrency(remaining);
        budgetRemainingEl.className = exceeded ? 'text-negative' : 'text-positive';
      }
    }

    if (topCategoryEl) {
      const topCat = analytics?.topExpenseCategory;
      topCategoryEl.textContent = topCat
        ? `${topCat.icon} ${topCat.name} (${formatCurrency(topCat.amount)})`
        : '—';
    }

    if (avgDailyEl) {
      avgDailyEl.textContent = formatCurrency(analytics?.averageDailyExpense ?? 0);
    }
  }

  #renderBudgetForm(budgetStatus) {
    const limitInput = this.#el('budget-limit-input');
    const periodInput = this.#el('budget-period-input');

    if (limitInput && document.activeElement !== limitInput && budgetStatus?.limit != null) {
      limitInput.value = String(budgetStatus.limit);
    }

    if (periodInput && document.activeElement !== periodInput && budgetStatus?.period) {
      periodInput.value = budgetStatus.period;
    }
  }

  #renderTransactions(transactions, categories) {
    const tbody = this.#el('transactions-tbody');
    if (!tbody) {
      return;
    }

    const catById = new Map(categories.map((cat) => [cat.id, cat]));
    tbody.innerHTML = '';

    if (!Array.isArray(transactions) || transactions.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'empty-state';
      td.textContent = 'Транзакцій за обраними критеріями ще немає. Натисніть «+ Додати операцію».';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    for (const tx of transactions) {
      const tr = document.createElement('tr');
      const cat = catById.get(tx.categoryId);
      const isIncome = tx.type === 'income';

      const dateTd = document.createElement('td');
      dateTd.textContent = tx.date;

      const catTd = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = 'cat-chip';
      chip.textContent = cat ? `${cat.icon} ${cat.name}` : tx.categoryId;
      catTd.appendChild(chip);

      const noteTd = document.createElement('td');
      noteTd.textContent = tx.note || '—';

      const typeTd = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = `type-pill ${isIncome ? 'type-income' : 'type-expense'}`;
      pill.textContent = isIncome ? 'Дохід' : 'Витрата';
      typeTd.appendChild(pill);

      const amountTd = document.createElement('td');
      amountTd.className = `align-right amount-cell ${isIncome ? 'text-positive' : 'text-negative'}`;
      amountTd.textContent = formatSignedCurrency(tx.getSignedAmount());

      const actionTd = document.createElement('td');
      actionTd.className = 'align-right';
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-ghost-danger';
      delBtn.setAttribute('data-tx-id', tx.id);
      delBtn.textContent = 'Видалити';
      actionTd.appendChild(delBtn);

      tr.append(dateTd, catTd, noteTd, typeTd, amountTd, actionTd);
      tbody.appendChild(tr);
    }
  }

  #renderCharts(analytics) {
    if (typeof window.Chart === 'undefined') {
      return;
    }

    window.Chart.defaults.color = '#94a3b8';
    window.Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.14)';

    this.#renderCashflowChart(analytics?.cashflow ?? { labels: [], incomeData: [], expenseData: [] });
    this.#renderCategoryChart(analytics?.expensesByCategory ?? []);
  }

  #renderCashflowChart({ labels = [], incomeData = [], expenseData = [] }) {
    const canvas = this.#el('cashflow-chart');
    if (!canvas) {
      return;
    }

    if (this.#cashflowChart) {
      this.#cashflowChart.destroy();
      this.#cashflowChart = null;
    }

    this.#cashflowChart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Доходи (₴)',
            data: incomeData,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.16)',
            tension: 0.35,
            fill: true,
            borderWidth: 2,
          },
          {
            label: 'Витрати (₴)',
            data: expenseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            tension: 0.35,
            fill: true,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    });
  }

  #renderCategoryChart(expensesByCategory) {
    const canvas = this.#el('category-chart');
    if (!canvas) {
      return;
    }

    if (this.#categoryChart) {
      this.#categoryChart.destroy();
      this.#categoryChart = null;
    }

    const hasData = Array.isArray(expensesByCategory) && expensesByCategory.length > 0;
    const labels = hasData ? expensesByCategory.map((item) => item.name) : ['Немає витрат'];
    const values = hasData ? expensesByCategory.map((item) => item.amount) : [1];
    const palette = ['#8b5cf6', '#a855f7', '#38bdf8', '#f59e0b', '#ec4899', '#14b8a6'];

    this.#categoryChart = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: hasData
              ? labels.map((_, idx) => palette[idx % palette.length])
              : ['rgba(148, 163, 184, 0.2)'],
            borderColor: '#131c31',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'right',
          },
        },
      },
    });
  }
}