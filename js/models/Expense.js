import { Transaction } from './Transaction.js';

export class Expense extends Transaction {
  constructor(params = {}) {
    super(params);
  }

  get type() {
    return 'expense';
  }

  getSignedAmount() {
    return -this.amount;
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Некоректні дані для відновлення об’єкта Expense.');
    }

    if (data.type !== undefined && data.type !== 'expense') {
      throw new Error(`Очікувався тип транзакції "expense", отримано "${data.type}".`);
    }

    return new Expense({
      id: data.id,
      amount: data.amount,
      categoryId: data.categoryId,
      date: data.date,
      note: data.note ?? '',
    });
  }
}