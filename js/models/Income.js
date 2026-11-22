import { Transaction } from './Transaction.js';

export class Income extends Transaction {
  constructor(params = {}) {
    super(params);
  }

  get type() {
    return 'income';
  }

  getSignedAmount() {
    return this.amount;
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Некоректні дані для відновлення об’єкта Income.');
    }

    if (data.type !== undefined && data.type !== 'income') {
      throw new Error(`Очікувався тип транзакції "income", отримано "${data.type}".`);
    }

    return new Income({
      id: data.id,
      amount: data.amount,
      categoryId: data.categoryId,
      date: data.date,
      note: data.note ?? '',
    });
  }
}