import { Wallet } from '../models/Wallet.js';
import { Category } from '../models/Category.js';

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function getMonthKey(isoDate) {
  return typeof isoDate === 'string' && isoDate.length >= 7 ? isoDate.slice(0, 7) : '';
}

function calculateDaySpan(dates) {
  if (!Array.isArray(dates) || dates.length === 0) {
    return 0;
  }

  const sorted = [...dates].sort();
  const first = new Date(`${sorted[0]}T00:00:00Z`);
  const last = new Date(`${sorted[sorted.length - 1]}T00:00:00Z`);

  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) {
    return 1;
  }

  const diffMs = last.getTime() - first.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export class Statistics {
  #wallet;

  constructor(wallet) {
    if (!(wallet instanceof Wallet)) {
      throw new Error('Statistics очікує коректний екземпляр класу Wallet.');
    }
    this.#wallet = wallet;
  }

  getTotalIncome(filters = {}) {
    const transactions = this.#wallet.getTransactions(filters);
    if (transactions.length === 0) {
      return 0;
    }
    return this.#wallet.getTotalIncome(transactions);
  }

  getTotalExpense(filters = {}) {
    const transactions = this.#wallet.getTransactions(filters);
    if (transactions.length === 0) {
      return 0;
    }
    return this.#wallet.getTotalExpense(transactions);
  }

  getBalance(filters = {}) {
    const transactions = this.#wallet.getTransactions(filters);
    if (transactions.length === 0) {
      return 0;
    }
    return this.#wallet.getBalance(transactions);
  }

  getExpensesByCategory(categories = [], filters = {}) {
    const expenses = this.#wallet.getTransactions({ ...filters, type: 'expense' });
    const totalExpense = this.#wallet.getTotalExpense(expenses);

    if (expenses.length === 0 || totalExpense === 0) {
      return [];
    }

    const categoryMap = new Map();
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (cat instanceof Category) {
          categoryMap.set(cat.id, cat);
        } else if (cat && typeof cat === 'object' && cat.id) {
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name ?? cat.id,
            icon: cat.icon ?? 'tag',
          });
        }
      }
    }

    const totalsByCategoryId = new Map();
    for (const tx of expenses) {
      const current = totalsByCategoryId.get(tx.categoryId) ?? 0;
      totalsByCategoryId.set(tx.categoryId, roundMoney(current + tx.amount));
    }

    return Array.from(totalsByCategoryId.entries())
      .map(([categoryId, amount]) => {
        const meta = categoryMap.get(categoryId);
        const percentage = Math.round((amount / totalExpense) * 10000) / 100;

        return {
          categoryId,
          name: meta?.name ?? categoryId,
          icon: meta?.icon ?? 'tag',
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  getIncomeByMonth(filters = {}) {
    const incomes = this.#wallet.getTransactions({ ...filters, type: 'income' });
    if (incomes.length === 0) {
      return [];
    }

    const monthlyTotals = new Map();
    for (const tx of incomes) {
      const month = getMonthKey(tx.date);
      if (!month) {
        continue;
      }
      const current = monthlyTotals.get(month) ?? 0;
      monthlyTotals.set(month, roundMoney(current + tx.amount));
    }

    return Array.from(monthlyTotals.entries())
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, amount]) => ({ month, amount }));
  }

  getExpenseByMonth(filters = {}) {
    const expenses = this.#wallet.getTransactions({ ...filters, type: 'expense' });
    if (expenses.length === 0) {
      return [];
    }

    const monthlyTotals = new Map();
    for (const tx of expenses) {
      const month = getMonthKey(tx.date);
      if (!month) {
        continue;
      }
      const current = monthlyTotals.get(month) ?? 0;
      monthlyTotals.set(month, roundMoney(current + tx.amount));
    }

    return Array.from(monthlyTotals.entries())
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, amount]) => ({ month, amount }));
  }

  getTopExpenseCategory(categories = [], filters = {}) {
    const breakdown = this.getExpensesByCategory(categories, filters);
    if (breakdown.length === 0) {
      return null;
    }
    return breakdown[0];
  }

  getAverageDailyExpense(filters = {}, { mode = 'span' } = {}) {
    const expenses = this.#wallet.getTransactions({ ...filters, type: 'expense' });
    if (expenses.length === 0) {
      return 0;
    }

    const totalExpense = this.#wallet.getTotalExpense(expenses);
    if (totalExpense === 0) {
      return 0;
    }

    const uniqueDates = new Set(expenses.map((tx) => tx.date));
    const divisor =
      mode === 'active-days'
        ? Math.max(1, uniqueDates.size)
        : calculateDaySpan(Array.from(uniqueDates));

    return roundMoney(totalExpense / divisor);
  }
}