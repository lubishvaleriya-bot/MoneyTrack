const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function formatLocalDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class Transaction {
  #id;
  #amount;
  #categoryId;
  #date;
  #note;

  constructor({ id, amount, categoryId, date, note = '' } = {}) {
    this.#id = this.#validateId(id ?? createDefaultId());
    this.#amount = this.#validateAmount(amount);
    this.#categoryId = this.#validateCategoryId(categoryId);
    this.#date = this.#validateDate(date);
    this.#note = this.#validateNote(note);
  }

  get id() {
    return this.#id;
  }

  get amount() {
    return this.#amount;
  }

  get categoryId() {
    return this.#categoryId;
  }

  get date() {
    return this.#date;
  }

  get note() {
    return this.#note;
  }

  get type() {
    throw new Error('Властивість type має бути перевизначена у підкласі Transaction.');
  }

  getSignedAmount() {
    throw new Error('Метод getSignedAmount() має бути перевизначений у підкласі Transaction.');
  }

  getSummary() {
    return {
      id: this.#id,
      type: this.type,
      amount: this.#amount,
      signedAmount: this.getSignedAmount(),
      categoryId: this.#categoryId,
      date: this.#date,
      note: this.#note,
    };
  }

  toString() {
    const sign = this.getSignedAmount() >= 0 ? '+' : '-';
    const notePart = this.#note ? ` — ${this.#note}` : '';
    return `[${this.#date}] (${this.type}) ${sign}${this.#amount.toFixed(2)} [${this.#categoryId}]${notePart}`;
  }

  toJSON() {
    return {
      id: this.#id,
      type: this.type,
      amount: this.#amount,
      categoryId: this.#categoryId,
      date: this.#date,
      note: this.#note,
    };
  }

  static fromJSON() {
    throw new Error('Статичний метод fromJSON() має бути реалізований у підкласі Transaction.');
  }

  #validateId(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Ідентифікатор транзакції має бути непорожнім рядком.');
    }
    return value.trim();
  }

  #validateAmount(value) {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error('Сума транзакції має бути скінченним числом більшим за 0.');
    }
    return Math.round(numeric * 100) / 100;
  }

  #validateCategoryId(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Необхідно вказати коректну категорію транзакції.');
    }
    return value.trim();
  }

  #validateDate(value) {
    if (value === undefined || value === null || value === '') {
      return formatLocalDate(new Date());
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new Error('Передано некоректний об’єкт дати.');
      }
      return formatLocalDate(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!ISO_DATE_REGEX.test(trimmed)) {
        throw new Error('Дата транзакції має бути у форматі РРРР-ММ-ДД.');
      }
      const [yearStr, monthStr, dayStr] = trimmed.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const day = Number(dayStr);
      const parsed = new Date(Date.UTC(year, month - 1, day));

      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        throw new Error('Передана дата не існує в календарі.');
      }
      return trimmed;
    }

    throw new Error('Непідтримуваний формат дати транзакції.');
  }

  #validateNote(value) {
    if (typeof value !== 'string') {
      throw new Error('Опис транзакції має бути рядком.');
    }
    const trimmed = value.trim();
    if (trimmed.length > 200) {
      throw new Error('Опис транзакції не може перевищувати 200 символів.');
    }
    return trimmed;
  }
}