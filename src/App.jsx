import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'student-budget-expenses-v1';

const CATEGORIES = [
  { name: 'Еда', icon: '🍜', color: '#f97316' },
  { name: 'Транспорт', icon: '🚌', color: '#0ea5e9' },
  { name: 'Учёба', icon: '📚', color: '#8b5cf6' },
  { name: 'Развлечения', icon: '🎮', color: '#ec4899' },
  { name: 'Здоровье', icon: '💊', color: '#10b981' },
  { name: 'Покупки', icon: '🛍️', color: '#eab308' },
  { name: 'Другое', icon: '✨', color: '#64748b' },
];

const categoryMap = Object.fromEntries(CATEGORIES.map((category) => [category.name, category]));

function localIsoDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function currentMonth() {
  return localIsoDate().slice(0, 7);
}

function createDemoExpenses() {
  const today = localIsoDate();
  return [
    { id: 'demo-food-1500', amount: 1500, category: 'Еда', date: today, description: 'Обед в столовой' },
    { id: 'demo-transport-600', amount: 600, category: 'Транспорт', date: today, description: 'Проезд' },
    { id: 'demo-food-900', amount: 900, category: 'Еда', date: today, description: 'Кофе и перекус' },
  ];
}

function getInitialExpenses() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // If saved browser data is invalid, start with the useful demo state.
  }
  return createDemoExpenses();
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  }).format(value) + ' ₸';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function formatMonth(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}-01T12:00:00`));
}

function App() {
  const [expenses, setExpenses] = useState(getInitialExpenses);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [form, setForm] = useState({ amount: '', category: '', date: localIsoDate(), description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const monthExpenses = useMemo(
    () => expenses
      .filter((expense) => expense.date?.slice(0, 7) === selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))),
    [expenses, selectedMonth],
  );

  const summary = useMemo(() => {
    const total = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const today = localIsoDate();
    const todayTotal = expenses
      .filter((expense) => expense.date === today)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totals = CATEGORIES.map((category) => ({
      ...category,
      total: monthExpenses
        .filter((expense) => expense.category === category.name)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    }));
    const topCategory = totals.reduce(
      (top, category) => (category.total > 0 && (!top || category.total > top.total) ? category : top),
      null,
    );

    return { total, todayTotal, totals, topCategory };
  }, [expenses, monthExpenses]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    if (error) setError('');
  }

  function addExpense(event) {
    event.preventDefault();
    const amount = Number(form.amount);

    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setError('Укажите сумму больше нуля.');
      return;
    }
    if (!form.category) {
      setError('Выберите категорию расхода.');
      return;
    }
    if (!form.date) {
      setError('Укажите дату расхода.');
      return;
    }

    setExpenses((previous) => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        amount,
        category: form.category,
        date: form.date,
        description: form.description.trim(),
      },
    ]);
    setForm({ amount: '', category: '', date: form.date, description: '' });
  }

  function deleteExpense(id) {
    if (!window.confirm('Удалить этот расход? Отменить действие будет нельзя.')) return;
    setExpenses((previous) => previous.filter((expense) => expense.id !== id));
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Личный учёт расходов</p>
          <h1>Студенческий бюджет</h1>
          <p className="subtitle">Понятный бюджет для учёбы и жизни</p>
        </div>
        <label className="month-picker">
          <span>Выбранный месяц</span>
          <input
            aria-label="Выбранный месяц"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </header>

      <section className="stats-grid" aria-label="Аналитика расходов">
        <StatCard icon="◷" label="Сегодня" value={formatMoney(summary.todayTotal)} tone="blue" />
        <StatCard icon="₸" label="За выбранный месяц" value={formatMoney(summary.total)} tone="purple" />
        <StatCard
          icon={summary.topCategory?.icon || '◌'}
          label="Больше всего трачу на"
          value={summary.topCategory ? summary.topCategory.name : 'Пока нет данных'}
          note={summary.topCategory ? formatMoney(summary.topCategory.total) : 'Добавьте первый расход'}
          tone="orange"
        />
        <StatCard icon="≡" label="Количество расходов" value={monthExpenses.length} note="за выбранный месяц" tone="green" />
      </section>

      <section className="content-grid">
        <aside className="panel add-panel">
          <div className="panel-heading">
            <div className="heading-icon">+</div>
            <div>
              <h2>Новый расход</h2>
              <p>Заполните детали покупки</p>
            </div>
          </div>

          <form onSubmit={addExpense} noValidate>
            <label>
              <span>Сумма, ₸</span>
              <div className="amount-input">
                <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Например, 1500" value={form.amount} onChange={updateForm} />
                <b>₸</b>
              </div>
            </label>
            <label>
              <span>Категория</span>
              <select name="category" value={form.category} onChange={updateForm}>
                <option value="">Выберите категорию</option>
                {CATEGORIES.map((category) => <option key={category.name} value={category.name}>{category.icon} {category.name}</option>)}
              </select>
            </label>
            <label>
              <span>Дата</span>
              <input name="date" type="date" value={form.date} onChange={updateForm} />
            </label>
            <label>
              <span>Описание <i>необязательно</i></span>
              <textarea name="description" rows="3" placeholder="Например, продукты на неделю" value={form.description} onChange={updateForm} />
            </label>
            {error && <p className="form-error" role="alert">⚠ {error}</p>}
            <button className="primary-button" type="submit"><span>+</span> Добавить расход</button>
          </form>
        </aside>

        <div className="right-column">
          <section className="panel expense-panel">
            <div className="section-title-row">
              <div>
                <h2>Расходы за месяц</h2>
                <p>{formatMonth(selectedMonth)}</p>
              </div>
              <span className="records-count">{monthExpenses.length} {pluralRecords(monthExpenses.length)}</span>
            </div>

            {monthExpenses.length === 0 ? (
              <div className="empty-state">
                <span>☁</span>
                <h3>В этом месяце расходов пока нет</h3>
                <p>Добавьте первую запись — здесь появится ваша история.</p>
              </div>
            ) : (
              <ul className="expense-list">
                {monthExpenses.map((expense) => {
                  const category = categoryMap[expense.category] || categoryMap.Другое;
                  return (
                    <li className="expense-item" key={expense.id}>
                      <span className="category-icon" style={{ backgroundColor: `${category.color}1a`, color: category.color }}>{category.icon}</span>
                      <div className="expense-info">
                        <div className="expense-mainline"><strong>{expense.category}</strong><span>{formatDate(expense.date)}</span></div>
                        {expense.description && <p>{expense.description}</p>}
                      </div>
                      <strong className="expense-amount">−{formatMoney(Number(expense.amount))}</strong>
                      <button className="delete-button" type="button" aria-label={`Удалить расход ${expense.category} на ${formatMoney(expense.amount)}`} onClick={() => deleteExpense(expense.id)}>⌫</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="panel categories-panel">
            <div className="section-title-row">
              <div>
                <h2>Расходы по категориям</h2>
                <p>Распределение за {formatMonth(selectedMonth).toLowerCase()}</p>
              </div>
              <strong className="category-total">{formatMoney(summary.total)}</strong>
            </div>
            <div className="category-breakdown">
              {summary.totals.slice().sort((a, b) => b.total - a.total).map((category) => {
                  const percentage = summary.total ? (category.total / summary.total) * 100 : 0;
                  return (
                    <div className="category-row" key={category.name}>
                      <div className="category-label"><span className="small-category-icon" style={{ backgroundColor: `${category.color}1a` }}>{category.icon}</span><strong>{category.name}</strong><span>{formatMoney(category.total)}</span><em>{percentage.toFixed(0)}%</em></div>
                      <div className="progress-track" aria-label={`${category.name}: ${percentage.toFixed(0)}%`}><div className="progress-fill" style={{ width: `${percentage}%`, backgroundColor: category.color }} /></div>
                    </div>
                  );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value, note, tone }) {
  return <article className={`stat-card ${tone}`}><span className="stat-icon">{icon}</span><p>{label}</p><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function pluralRecords(count) {
  const modulo10 = count % 10;
  const modulo100 = count % 100;
  if (modulo10 === 1 && modulo100 !== 11) return 'запись';
  if (modulo10 >= 2 && modulo10 <= 4 && (modulo100 < 10 || modulo100 >= 20)) return 'записи';
  return 'записей';
}

export default App;
