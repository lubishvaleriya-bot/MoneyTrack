import { Transaction } from './Transaction.js';
import { Income } from './Income.js';
import { Expense } from './Expense.js';

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

export class Wallet {
  #transactions;

  constructor(initialTransactions = []) {
    this.#transactions = [];

    if (!Array.isArray(initialTransactions)) {
      throw new Error('Початковий список транзакцій має бути масивом.');
    }

    for (const item of initialTransactions) {
      this.addTransaction(item);
    }
  }

  addTransaction(transaction) {
    if (!(transaction instanceof Transaction)) {
      throw new Error('Очікується коректний екземпляр класу Transaction (Income або Expense).');
    }

    const duplicateExists = this.#transactions.some((item) => item.id === transaction.id);
    if (duplicateExists) {
      throw new Error(`Транзакція з ідентифікатором "${transaction.id}" уже існує у гаманці.`);
    }

    this.#transactions.push(transaction);
    return transaction;
  }

  removeTransaction(transactionId) {
    if (typeof transactionId !== 'string' || transactionId.trim().length === 0) {
      throw new Error('Ідентифікатор транзакції для видалення має бути непорожнім рядком.');
    }

    const targetId = transactionId.trim();
    const index = this.#transactions.findIndex((item) => item.id === targetId);

    if (index === -1) {
      return false;
    }

    this.#transactions.splice(index, 1);
    return true;
  }

  getTransactionById(transactionId) {
    if (typeof transactionId !== 'string' || transactionId.trim().length === 0) {
      return null;
    }

    const targetId = transactionId.trim();
    return this.#transactions.find((item) => item.id === targetId) ?? null;
  }

  getTransactions({ type = 'all', categoryId = 'all', dateFrom = '', dateTo = '' } = {}) {
    const filtered = this.#transactions.filter((tx) => {
      if (type && type !== 'all' && tx.type !== type) {
        return false;
      }

      if (categoryId && categoryId !== 'all' && tx.categoryId !== categoryId) {
        return false;
      }

      if (dateFrom && tx.date < dateFrom) {
        return false;
      }

      if (dateTo && tx.date > dateTo) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  getTotalIncome(transactions = this.#transactions) {
    const list = Array.isArray(transactions) ? transactions : this.#transactions;
    const sum = list.reduce((acc, tx) => {
      if (!(tx instanceof Transaction)) {
        throw new Error('У списку виявлено некоректний об’єкт транзакції.');
      }
      return tx.type === 'income' ? acc + tx.amount : acc;
    }, 0);

    return roundMoney(sum);
  }

  getTotalExpense(transactions = this.#transactions) {
    const list = Array.isArray(transactions) ? transactions : this.#transactions;
    const sum = list.reduce((acc, tx) => {
      if (!(tx instanceof Transaction)) {
        throw new Error('У списку виявлено некоректний об’єкт транзакції.');
      }
      return tx.type === 'expense' ? acc + tx.amount : acc;
    }, 0);

    return roundMoney(sum);
  }

  getBalance(transactions = this.#transactions) {
    const list = Array.isArray(transactions) ? transactions : this.#transactions;
    const signedSum = list.reduce((acc, tx) => {
      if (!(tx instanceof Transaction)) {
        throw new Error('У списку виявлено некоректний об’єкт транзакції.');
      }
      return acc + tx.getSignedAmount();
    }, 0);

    return roundMoney(signedSum);
  }

  toJSON() {
    return {
      transactions: this.#transactions.map((tx) => tx.toJSON()),
    };
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') {
      return new Wallet([]);
    }

    const rawList = Array.isArray(data)
      ? data
      : Array.isArray(data.transactions)
        ? data.transactions
        : [];

    const restored = rawList.map((rawTx) => {
      if (!rawTx || typeof rawTx !== 'object') {
        throw new Error('Некоректний запис транзакції під час відновлення Wallet.');
      }

      if (rawTx.type === 'income') {
        return Income.fromJSON(rawTx);
      }

      if (rawTx.type === 'expense') {
        return Expense.fromJSON(rawTx);
      }

      throw new Error(`Невідомий тип транзакції під час відновлення: "${rawTx.type}".`);
    });

    return new Wallet(restored);
  }
}