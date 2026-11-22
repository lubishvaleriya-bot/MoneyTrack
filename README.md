# MoneyTrack — Вебзастосунок для обліку особистих фінансів

**MoneyTrack** — навчальний клієнтський вебзастосунок на чистому JavaScript (ES6+ та ES Modules) з використанням об’єктно-орієнтованого програмування, візуалізації через `Chart.js` і локального збереження даних у `LocalStorage`. Застосунок працює без бекенду, серверних баз даних та фронтенд-фреймворків.

---

## Використані технології

* **HTML5** — семантична розмітка дашборду, таблиці транзакцій, форм і модального вікна додавання фінансових операцій.
* **CSS3** — дизайн-система на CSS-змінних (темно-синій/графітовий фон, фіолетові акценти, зелений колір для доходів, червоний для витрат), Flexbox/Grid-сітки та адаптивна верстка (`css/style.css`, `css/responsive.css`).
* **JavaScript (ES6+ / ES2022)** — класи, приватні поля (`#`), геттери, статичні методи, `Map` і `Set`, обробка винятків (`try / catch`).
* **ES Modules (`type="module"`)** — модульна декомпозиція коду на моделі, сервіси, шар інтерфейсу та точку входу.
* **Chart.js** — побудова стовпчикової діаграми доходів і витрат за місяцями та кругової діаграми витрат за категоріями з динамічним оновленням.
* **LocalStorage** — локальне збереження та відновлення стану транзакцій і бюджетів між перезавантаженнями сторінки.

---

## Архітектура проєкту

Проєкт побудований за принципом **поділу відповідальності (Separation of Concerns)** та односпрямованого оновлення стану:

* **Моделі (`js/models/`)** — інкапсулюють стан предметної області та правила валідації:
  * `Transaction` — базовий клас операції з валідацією суми, категорії, дати, опису та ID.
  * `Income` — підклас доходів (`extends Transaction`), повертає тип `'income'` і додатний внесок у баланс (`+amount`).
  * `Expense` — підклас витрат (`extends Transaction`), повертає тип `'expense'` і від’ємний внесок у баланс (`-amount`).
  * `Category` — описує категорію (`id`, `name`, `type`, `icon`) та перевіряє сумісність із типом операції.
  * `Wallet` — керує колекцією транзакцій, додаванням/видаленням, фільтрацією та підрахунком балансу, доходів і витрат.
  * `Budget` — керує лімітом витрат і періодом, обчислює витрачену суму, залишок та відсоток використання ліміту.
* **Сервіси (`js/services/`)** — інкапсулюють аналітику та персистентність:
  * `Statistics` — формує підсумки, витрати за категоріями, доходи/витрати за місяцями, найбільшу категорію витрат і середні витрати за день (спираючись на методи `Wallet`).
  * `StorageService` — серіалізує та безпечно відновлює екземпляри `Income`, `Expense` і `Budget` із `LocalStorage`.
* **Інтерфейс (`js/ui/`)** — `Dashboard` відповідає за DOM-події, модальне вікно, рендеринг карток, фільтрів, списку транзакцій та графіків `Chart.js`.
* **Точка входу (`js/app.js`)** — `MoneyTrackApp` виконує композицію залежностей, обробляє дії користувача, синхронізує стан із `LocalStorage` і запускає повний рендер.

---

## UML-діаграма класів

```mermaid
classDiagram
    direction TB

    class Transaction {
        <<abstract>>
        -string #id
        -number #amount
        -string #categoryId
        -string #date
        -string #note
        +constructor(params)
        +get id() string
        +get amount() number
        +get categoryId() string
        +get date() string
        +get note() string
        +get type()* string
        +getSignedAmount()* number
        +toJSON() Object
        +static fromJSON(data)* Transaction
    }

    class Income {
        +get type() string
        +getSignedAmount() number
        +static fromJSON(data) Income
    }

    class Expense {
        +get type() string
        +getSignedAmount() number
        +static fromJSON(data) Expense
    }

    class Category {
        -string #id
        -string #name
        -string #type
        -string #icon
        +constructor(params)
        +get id() string
        +get name() string
        +get type() string
        +get icon() string
        +isCompatibleWith(transactionType) boolean
        +toJSON() Object
        +static fromJSON(data) Category
    }

    class Wallet {
        -Transaction[] #transactions
        +constructor(initialTransactions)
        +addTransaction(transaction) Transaction
        +removeTransaction(transactionId) boolean
        +getTransactionById(transactionId) Transaction
        +getTransactions(filters) Transaction[]
        +getTotalIncome(transactions) number
        +getTotalExpense(transactions) number
        +getBalance(transactions) number
        +toJSON() Object
        +static fromJSON(data) Wallet
    }

    class Budget {
        -string #categoryId
        -number #limit
        -string #period
        +constructor(params)
        +get categoryId() string
        +get limit() number
        +get period() string
        +updateLimit(newLimit) number
        +updatePeriod(newPeriod) string
        +calculateSpent(transactions) number
        +getUsagePercentage(transactions) number
        +getRemaining(transactions) number
        +isExceeded(transactions) boolean
        +toJSON() Object
        +static fromJSON(data) Budget
    }

    class Statistics {
        -Wallet #wallet
        +constructor(wallet)
        +getTotalIncome(filters) number
        +getTotalExpense(filters) number
        +getBalance(filters) number
        +getExpensesByCategory(categories, filters) Array
        +getIncomeByMonth(filters) Array
        +getExpenseByMonth(filters) Array
        +getTopExpenseCategory(categories, filters) Object
        +getAverageDailyExpense(filters, options) number
    }

    class StorageService {
        -string #transactionsKey
        -string #budgetsKey
        +constructor(keys)
        +saveTransactions(transactions) boolean
        +loadTransactions() Transaction[]
        +saveBudgets(budgets) boolean
        +loadBudgets() Budget[]
        +clearAll() void
    }

    class Dashboard {
        -HTMLElement #root
        -Object #handlers
        -Chart #monthlyChart
        -Chart #categoryChart
        +constructor(rootElement, handlers)
        +openTransactionModal(defaultType) void
        +closeTransactionModal() void
        +render(viewModel) void
        +showTransactionError(message) void
        +showBudgetError(message) void
    }

    Transaction <|-- Income : extends
    Transaction <|-- Expense : extends
    Wallet *-- Transaction : owns
    Budget ..> Transaction : evaluates expenses
    Statistics --> Wallet : reads data from
    Statistics ..> Category : resolves metadata
    StorageService ..> Income : restores
    StorageService ..> Expense : restores
    StorageService ..> Budget : restores
    Dashboard ..> Statistics : renders analytics