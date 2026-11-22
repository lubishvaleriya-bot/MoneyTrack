import { Income } from './models/Income.js';
import { Expense } from './models/Expense.js';
import { Category } from './models/Category.js';
import { Wallet } from './models/Wallet.js';
import { Budget } from './models/Budget.js';
import { Statistics } from './services/Statistics.js';
import { StorageService } from './services/StorageService.js';
import { Dashboard } from './ui/Dashboard.js';

const DEFAULT_CATEGORIES = [
  new Category({ id: 'cat-salary', name: 'Зарплата', type: 'income', icon: '💼' }),
  new Category({ id: 'cat-freelance', name: 'Фриланс / Бонуси', type: 'income', icon: '✨' }),
  new Category({ id: 'cat-food', name: 'Продукти', type: 'expense', icon: '🛒' }),
  new Category({ id: 'cat-transport', name: 'Транспорт', type: 'expense', icon: '🚇' }),
  new Category({ id: 'cat-housing', name: 'Житло та комунальні', type: 'expense', icon: '🏠' }),
  new Category({ id: 'cat-leisure', name: 'Кафе та відпочинок', type: 'expense', icon: '☕' }),
];

function getCurrentMonthPeriod() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function buildMonthlySeries(incomeByMonth, expenseByMonth) {
  const monthsSet = new Set([
    ...incomeByMonth.map((item) => item.month),
    ...expenseByMonth.map((item) => item.month),
  ]);
  const labels = Array.from(monthsSet).sort();

  const incomeMap = new Map(incomeByMonth.map((item) => [item.month, item.amount]));
  const expenseMap = new Map(expenseByMonth.map((item) => [item.month, item.amount]));

  return {
    labels,
    incomeData: labels.map((m) => incomeMap.get(m) ?? 0),
    expenseData: labels.map((m) => expenseMap.get(m) ?? 0),
  };
}

class MoneyTrackApp {
  #storage;
  #wallet;
  #budget;
  #statistics;
  #dashboard;
  #filters;

  constructor() {
    this.#storage = new StorageService();
    this.#filters = {
      type: 'all',
      categoryId: 'all',
      dateFrom: '',
      dateTo: '',
    };

    const loadedTransactions = this.#storage.loadTransactions();
    this.#wallet = new Wallet(loadedTransactions);

    const loadedBudgets = this.#storage.loadBudgets();
    this.#budget =
      loadedBudgets[0] ??
      new Budget({
        categoryId: null,
        limit: 20000,
        period: getCurrentMonthPeriod(),
      });

    this.#statistics = new Statistics(this.#wallet);

    const root = document.getElementById('app-root');
    this.#dashboard = new Dashboard(root, {
      onAddTransaction: (formData) => this.handleAddTransaction(formData),
      onDeleteTransaction: (txId) => this.handleDeleteTransaction(txId),
      onFilterChange: (nextFilters) => this.handleFilterChange(nextFilters),
      onUpdateBudget: (budgetData) => this.handleUpdateBudget(budgetData),
    });

    this.renderAll();
  }

  handleAddTransaction(formData) {
    try {
      const rawType = String(formData.type ?? '').trim();
      if (rawType !== 'income' && rawType !== 'expense') {
        throw new Error('Оберіть коректний тип операції: дохід або витрата.');
      }

      const rawAmount = String(formData.amount ?? '').trim();
      if (rawAmount === '') {
        throw new Error('Введіть суму операції.');
      }

      const numericAmount = Number(rawAmount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Сума операції має бути числом більшим за 0.');
      }

      const categoryId = String(formData.categoryId ?? '').trim();
      if (!categoryId) {
        throw new Error('Оберіть категорію операції.');
      }

      const category = DEFAULT_CATEGORIES.find((cat) => cat.id === categoryId);
      if (!category) {
        throw new Error('Обрана категорія не знайдена.');
      }
      if (!category.isCompatibleWith(rawType)) {
        throw new Error('Обрана категорія не відповідає типу операції.');
      }

      const dateStr = String(formData.date ?? '').trim();
      if (!dateStr) {
        throw new Error('Оберіть дату операції.');
      }

      const payload = {
        amount: numericAmount,
        categoryId,
        date: dateStr,
        note: String(formData.note ?? '').trim(),
      };

      const transaction =
        rawType === 'income' ? new Income(payload) : new Expense(payload);

      this.#wallet.addTransaction(transaction);
      this.#storage.saveTransactions(this.#wallet.getTransactions());

      this.#dashboard.closeTransactionModal();
      this.renderAll();
    } catch (error) {
      this.#dashboard.showTransactionError(error.message || 'Некоректні дані операції.');
    }
  }

  handleDeleteTransaction(txId) {
    const removed = this.#wallet.removeTransaction(txId);
    if (!removed) {
      return;
    }
    this.#storage.saveTransactions(this.#wallet.getTransactions());
    this.renderAll();
  }

  handleFilterChange(nextFilters) {
    const dateFrom = nextFilters.dateFrom || '';
    const dateTo = nextFilters.dateTo || '';

    if (dateFrom && dateTo && dateFrom > dateTo) {
      this.#dashboard.showBudgetError('Початкова дата фільтра не може бути пізнішою за кінцеву.');
    } else {
      this.#dashboard.clearBudgetError();
    }

    this.#filters = {
      type: nextFilters.type || 'all',
      categoryId: nextFilters.categoryId || 'all',
      dateFrom,
      dateTo,
    };
    this.renderAll();
  }

  handleUpdateBudget(budgetData) {
    try {
      this.#budget.updateLimit(budgetData.limit);
      if (budgetData.period && String(budgetData.period).trim() !== '') {
        this.#budget.updatePeriod(String(budgetData.period).trim());
      }
      this.#storage.saveBudgets([this.#budget]);
      this.#dashboard.clearBudgetError();
      this.renderAll();
    } catch (error) {
      this.#dashboard.showBudgetError(error.message || 'Некоректне значення бюджету.');
    }
  }

  renderAll() {
    const allTransactions = this.#wallet.getTransactions();
    const filteredTransactions = this.#wallet.getTransactions(this.#filters);

    const totalIncome = this.#statistics.getTotalIncome();
    const totalExpense = this.#statistics.getTotalExpense();
    const balance = this.#statistics.getBalance();

    const incomeCount = allTransactions.filter((tx) => tx.type === 'income').length;
    const expenseCount = allTransactions.filter((tx) => tx.type === 'expense').length;

    const spentInPeriod = this.#budget.calculateSpent(allTransactions);
    const limit = this.#budget.limit;
    const percentage = this.#budget.getUsagePercentage(allTransactions);
    const remaining = this.#budget.getRemaining(allTransactions);
    const isExceeded = this.#budget.isExceeded(allTransactions);

    const expensesByCategory = this.#statistics.getExpensesByCategory(DEFAULT_CATEGORIES);
    const topExpenseCategory = this.#statistics.getTopExpenseCategory(DEFAULT_CATEGORIES);
    const averageDailyExpense = this.#statistics.getAverageDailyExpense();

    const incomeByMonth = this.#statistics.getIncomeByMonth();
    const expenseByMonth = this.#statistics.getExpenseByMonth();
    const monthlyCashflow = buildMonthlySeries(incomeByMonth, expenseByMonth);

    this.#dashboard.render({
      summary: {
        balance,
        totalIncome,
        totalExpense,
        incomeCount,
        expenseCount,
      },
      budgetStatus: {
        limit,
        spent: spentInPeriod,
        remaining,
        percentage,
        isExceeded,
        period: this.#budget.period,
      },
      categories: DEFAULT_CATEGORIES,
      transactions: filteredTransactions,
      filters: this.#filters,
      analytics: {
        monthlyCashflow,
        expensesByCategory,
        topExpenseCategory,
        averageDailyExpense,
      },
    });
  }
}

function startMoneyTrack() {
  const root = document.getElementById('app-root');
  if (!root) {
    console.error('MoneyTrack: не знайдено контейнер #app-root.');
    return;
  }
  new MoneyTrackApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMoneyTrack);
} else {
  startMoneyTrack();
}