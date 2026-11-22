const VALID_CATEGORY_TYPES = new Set(['income', 'expense']);

function createDefaultCategoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class Category {
  #id;
  #name;
  #type;
  #icon;

  constructor({ id, name, type, icon = 'tag' } = {}) {
    this.#id = this.#validateId(id ?? createDefaultCategoryId());
    this.#name = this.#validateName(name);
    this.#type = this.#validateType(type);
    this.#icon = this.#validateIcon(icon);
  }

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }

  get type() {
    return this.#type;
  }

  get icon() {
    return this.#icon;
  }

  isCompatibleWith(transactionType) {
    if (typeof transactionType !== 'string') {
      return false;
    }
    return this.#type === transactionType.trim();
  }

  toJSON() {
    return {
      id: this.#id,
      name: this.#name,
      type: this.#type,
      icon: this.#icon,
    };
  }

  static fromJSON(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Некоректні дані для відновлення об’єкта Category.');
    }

    return new Category({
      id: data.id,
      name: data.name,
      type: data.type,
      icon: data.icon ?? 'tag',
    });
  }

  #validateId(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Ідентифікатор категорії має бути непорожнім рядком.');
    }
    return value.trim();
  }

  #validateName(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Назва категорії є обов’язковою і має бути непорожнім рядком.');
    }
    const trimmed = value.trim();
    if (trimmed.length > 60) {
      throw new Error('Назва категорії не може перевищувати 60 символів.');
    }
    return trimmed;
  }

  #validateType(value) {
    if (typeof value !== 'string') {
      throw new Error('Тип категорії має бути рядком ("income" або "expense").');
    }
    const normalized = value.trim();
    if (!VALID_CATEGORY_TYPES.has(normalized)) {
      throw new Error('Тип категорії може бути лише "income" або "expense".');
    }
    return normalized;
  }

  #validateIcon(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Іконка категорії має бути непорожнім рядком.');
    }
    const trimmed = value.trim();
    if (trimmed.length > 40) {
      throw new Error('Назва або символ іконки не може перевищувати 40 символів.');
    }
    return trimmed;
  }
}