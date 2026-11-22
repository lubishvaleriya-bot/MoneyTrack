import { Income } from '../models/Income.js';
import { Expense } from '../models/Expense.js';
import { Budget } from '../models/Budget.js';

const DEFAULT_TRANSACTIONS_KEY = 'moneytrack.transactions.v1';
const DEFAULT_BUDGETS_KEY = 'moneytrack.budgets.v1';

export class StorageService {
  #transactionsKey;
  #budgetsKey;

  constructor({
    transactionsKey = DEFAULT_TRANSACTIONS_KEY,
    budgetsKey = DEFAULT_BUDGETS_KEY,
  } = {}) {
    if (typeof transactionsKey !== 'string' || transactionsKey.trim().length === 0) {
      throw new Error('Ключ сховища транзакцій має бути непорожнім рядком.');
    }
    if (typeof budgetsKey !== 'string' || budgetsKey.trim().length === 0) {
      throw new Error('Ключ сховища бюджетів має бути непорожнім рядком.');
    }

    this.#transactionsKey = transactionsKey.trim();
    this.#budgetsKey = budgetsKey.trim();
  }

  #getStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('LocalStorage недоступний у поточному середовищі.');
    }
    return window.localStorage;
  }

  saveTransactions(transactions) {
    if (!Array.isArray(transactions)) {
      throw new Error('Список транзакцій для збереження має бути масивом.');
    }

    const storage = this.#getStorage();
    const serialized = transactions.map((tx) => {
      if (tx && typeof tx.toJSON === 'function') {
        return tx.toJSON();
      }
      return tx;
    });

    storage.setItem(this.#transactionsKey, JSON.stringify(serialized));
    return true;
  }

  loadTransactions() {
    const storage = this.#getStorage();
    const rawValue = storage.getItem(this.#transactionsKey);

    if (!rawValue) {
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      console.warn('MoneyTrack: пошкоджений JSON у транзакціях LocalStorage, повертаємо [].', error);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.warn('MoneyTrack: очікувався масив транзакцій у LocalStorage, повертаємо [].');
      return [];
    }

    const restored = [];
    for (const item of parsed) {
      try {
        restored.push(this.#restoreTransaction(item));
      } catch (error) {
        console.warn('MoneyTrack: пропущено некоректний запис транзакції під час відновлення.', error);
      }
    }

    return restored;
  }

  saveBudgets(budgets) {
    if (!Array.isArray(budgets)) {
      throw new Error('Список бюджетів для збереження має бути масивом.');
    }

    const storage = this.#getStorage();
    const serialized = budgets.map((budget) => {
      if (budget && typeof budget.toJSON === 'function') {
        return budget.toJSON();
      }
      return budget;
    });

    storage.setItem(this.#budgetsKey, JSON.stringify(serialized));
    return true;
  }

  loadBudgets() {
    const storage = this.#getStorage();
    const rawValue = storage.getItem(this.#budgetsKey);

    if (!rawValue) {
      return [];
    }

    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      console.warn('MoneyTrack: пошкоджений JSON у бюджетах LocalStorage, повертаємо [].', error);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.warn('MoneyTrack: очікувався масив бюджетів у LocalStorage, повертаємо [].');
      return [];
    }

    const restored = [];
    for (const item of parsed) {
      try {
        restored.push(Budget.fromJSON(item));
      } catch (error) {
        console.warn('MoneyTrack: пропущено некоректний запис бюджету під час відновлення.', error);
      }
    }

    return restored;
  }

  clearAll() {
    const storage = this.#getStorage();
    storage.removeItem(this.#transactionsKey);
    storage.removeItem(this.#budgetsKey);
  }

  #restoreTransaction(rawTx) {
    if (!rawTx || typeof rawTx !== 'object') {
      throw new Error('Запис транзакції має бути об’єктом.');
    }

    if (rawTx.type === 'income') {
      return Income.fromJSON(rawTx);
    }

    if (rawTx.type === 'expense') {
      return Expense.fromJSON(rawTx);
    }

    throw new Error(`Невідомий тип транзакції: "${rawTx.type}".`);
  }
}