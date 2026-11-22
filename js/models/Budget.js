import { Transaction } from './Transaction.js';
import { Category } from './Category.js';

const MONTH_PERIOD_REGEX = /^\d{4}-\d{2}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function getCurrentMonthPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export class Budget {
  #categoryId;
  #limit;
  #period;

  constructor({ categoryId = null, limit, period } = {}) {
    this.#categoryId = this.#validateCategoryId(categoryId);
    this.#limit = this.#validateLimit(limit);
    this.#period = this.#validatePeriod(period);
  }

  get categoryId() {
    return this.#categoryId;
  }

  get limit() {
    return this.#limit;
  }

  get period() {
    return this.#period;
  }

  updateLimit(newLimit) {
    this.#limit = this.#validateLimit(newLimit);
    return this.#limit;
  }

  updatePeriod(newPeriod) {
    this.#period = this.#validatePeriod(newPeriod);
    return this.#period;
  }

  matchesTransaction(transaction) {
    if (!(transaction instanceof Transaction)) {
      throw new Error('Очікується коректний екземпляр класу Transaction.');
    }

    if (transaction.type !== 'expense') {
      return false;
    }

    if (!transaction.date.startsWith(`${this.#period}-`)) {
      return false;
    }

    if (this.#categoryId !== null && transaction.categoryId !== this.#categoryId) {
      return false;
    }

    return true;
  }

  calculateSpent(transactions = []) {
    if (!Array.isArray(transactions)) {
      throw new Error('Список транзакцій для розрахунку бюджету має бути масивом.');
    }

    let totalSpent = 0;
    for (const tx of transactions) {
      if (this.matchesTransaction(tx)) {
        totalSpent += tx.amount;
      }
    }

    return roundMoney(totalSpent);
  }

  getUsagePercentage(transactions = []) {
    const spent = this.calculateSpent(transactions);
    if (this.#limit === 0) {
      return spent > 0 ? 100 : 0;
    }
    const percentage = (spent / this.#limit) * 100;
    return Math.round(percentage * 100) / 100;
  }

  getRemaining(transactions = []) {
    const spent = this.calculateSpent(transactions);
    return roundMoney(this.#limit - spent);
  }

  isExceeded(transactions = []) {
    return this.calculateSpent(transactions) > this.#limit;
  }

  isCompatibleWithCategory(category) {
    if (!(category instanceof Category)) {
      throw new Error('Очікується екземпляр класу Category.');
    }

    if (this.#categoryId === null) {
      return true;
    }

    return category.id === this.#categoryId && category.type === 'expense';
  }

  toJSON() {
    return {
      categoryId: this.#categoryId,
      limit: this.#limit,
      period: this.#period,
    };
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Некоректні дані для відновлення об’єкта Budget.');
    }

    return new Budget({
      categoryId: data.categoryId ?? null,
      limit: data.limit,
      period: data.period,
    });
  }

  #validateCategoryId(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Ідентифікатор категорії бюджету має бути рядком або null.');
    }
    return value.trim();
  }

  #validateLimit(value) {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error('Ліміт бюджету має бути скінченним числом більшим за 0.');
    }
    return roundMoney(numeric);
  }

  #validatePeriod(value) {
    if (value === undefined || value === null || value === '') {
      return getCurrentMonthPeriod();
    }

    if (typeof value !== 'string') {
      throw new Error('Період бюджету має бути рядком у форматі "РРРР-ММ" або "РРРР-ММ-ДД".');
    }

    const trimmed = value.trim();
    if (MONTH_PERIOD_REGEX.test(trimmed) || ISO_DATE_REGEX.test(trimmed)) {
      return trimmed;
    }

    throw new Error('Некоректний формат періоду бюджету (очікується "РРРР-ММ" або "РРРР-ММ-ДД").');
  }
}