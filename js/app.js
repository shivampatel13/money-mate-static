import { categories as defaultCategories, defaultPayroll, paymentMethods } from "./defaults.js";
import { budgetProgress, calculatePayroll, categoryTotals, expenseTotals, money, moneyExact, monthlySubscriptionAmount, summary, today } from "./calculations.js";
import { getSession, loadData, login, logout, makeId, register, requestPasswordReset, saveData } from "./storage.js";

const app = document.querySelector("#app");
let session = getSession();
let state = session ? loadData(session.id) : null;
let route = location.hash.replace("#/", "") || "dashboard";
let message = "";
let authMode = "login";
let authMessage = "";

const nav = [
  ["dashboard", "Dashboard", "D"],
  ["budget", "Budget", "B"],
  ["spend", "Spend", "S"],
  ["pay", "Pay", "P"],
  ["accounts", "Accounts", "A"],
  ["more", "More", "M"],
];

const persist = () => session && saveData(session.id, state);
const setRoute = (next) => {
  route = next;
  location.hash = `/${next}`;
  render();
};
const flash = (text) => {
  message = text;
  render();
  setTimeout(() => {
    message = "";
    render();
  }, 1800);
};

window.addEventListener("hashchange", () => {
  route = location.hash.replace("#/", "") || "dashboard";
  render();
});

function shell(content) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo-row">
          <div class="logo">M</div>
          <div>
            <p class="eyebrow">Money Mate</p>
            <h3>Simple finance</h3>
          </div>
        </div>
        <nav class="nav">${nav.map(([key, label, icon]) => navButton(key, label, icon)).join("")}</nav>
        <div class="profile-card">
          <p class="small muted">Logged in as</p>
          <strong>${escapeHtml(session.name)}</strong>
          <button class="btn btn-secondary full" data-action="logout">Log out</button>
        </div>
      </aside>
      <main class="main">
        <div class="mobile-top">
          <div>
            <p class="eyebrow">Money Mate</p>
            <strong>${escapeHtml(session.name)}</strong>
          </div>
          <button class="btn btn-ghost" data-action="logout">Log out</button>
        </div>
        ${message ? `<p class="success">${message}</p>` : ""}
        ${content}
      </main>
      <nav class="bottom-nav">${nav.slice(0, 5).map(([key, label, icon]) => navButton(key, label, icon)).join("")}</nav>
    </div>
  `;
}

function navButton(key, label, icon) {
  return `<button class="${route === key ? "active" : ""}" data-route="${key}"><span class="icon blue">${icon}</span><span>${label}</span></button>`;
}

function pageHead(title, text, action = "") {
  return `<div class="page-head"><div><h1>${title}</h1><p class="muted">${text}</p></div>${action}</div>`;
}

function dashboardPage() {
  const s = summary(state);
  const categories = categoryTotals(state.expenses);
  const budgets = budgetProgress(state.budgets, state.expenses);
  const totalBudget = budgets.reduce((sum, item) => sum + item.limit, 0);
  const spentBudget = budgets.reduce((sum, item) => sum + item.spent, 0);
  const bankTotal = state.accounts.filter((account) => account.type !== "credit_card").reduce((sum, account) => sum + account.balance, 0);
  const cardTotal = state.accounts.filter((account) => account.type === "credit_card").reduce((sum, account) => sum + account.balance, 0);
  return `
    ${pageHead("Dashboard", "A simple view of what comes in, what goes out, and what is left.")}
    <section class="hero">
      <div class="grid hero-grid">
        <div class="hero-inner">
          <p class="eyebrow">Money left this month</p>
          <div class="hero-value ${s.remaining < 0 ? "danger-text" : ""}">${money(s.remaining)}</div>
          <p class="muted">This is your estimated take-home pay minus spending, bills and minimum debt payments.</p>
          <button class="btn btn-primary" data-route="spend">Add spending</button>
        </div>
        <div class="grid">
          ${stat("Pay in", money(s.pay.netMonthly), "P", "blue")}
          ${stat("In accounts", money(bankTotal), "A", "teal")}
          ${stat("Money out", money(s.moneyOut), "O", "rose")}
          ${stat("Debt", money(s.debtTotal), "D", "amber")}
        </div>
      </div>
    </section>
    <section class="card">
      <div class="grid grid-4">
        ${action("spend", "Add spending", "Daily purchase", "S", "blue")}
        ${action("budget", "Set budget", "Monthly limits", "B", "violet")}
        ${action("pay", "Check pay", "Hourly income", "P", "teal")}
        ${action("more", "Bills and debts", "Regular payments", "M", "amber")}
      </div>
    </section>
    <div class="grid grid-2">
      <section class="card">
        <h2>Your accounts</h2>
        <div class="grid grid-2">
          ${stat("Bank and cash", money(bankTotal), "B", "blue")}
          ${stat("Credit cards", money(cardTotal), "C", cardTotal ? "rose" : "teal")}
        </div>
        <button class="btn btn-secondary full" data-route="accounts">View accounts</button>
      </section>
      <section class="card">
        <h2>Budget progress</h2>
        ${totalBudget ? progressLine("All budgets", spentBudget, totalBudget) : empty("No budget yet", "Create a monthly budget to see your progress.")}
      </section>
      <section class="card">
        <h2>Where your money goes</h2>
        ${bars(categories, "No spending yet", "Add a few purchases to see this chart.")}
      </section>
    </div>
  `;
}

function payPage() {
  const p = state.payroll;
  const result = calculatePayroll(p, state.taxSettings);
  return `
    ${pageHead("Pay Calculator", "Enter hourly pay and weekly hours. More tax options are hidden below.")}
    <div class="grid grid-2">
      <section class="card">
        <h2>Your basic pay</h2>
        ${input("hourlyRate", "Hourly rate", p.hourlyRate, "number")}
        ${input("hoursPerWeek", "Hours per week", p.hoursPerWeek, "number")}
        <details>
          <summary>More pay and tax options</summary>
          ${input("overtimeHours", "Overtime hours", p.overtimeHours, "number")}
          ${input("overtimeRate", "Overtime hourly rate", p.overtimeRate, "number")}
          ${input("pensionPercentage", "Pension percentage", p.pensionPercentage, "number")}
          ${select("region", "Region", p.region, [["england_wales_ni", "England, Wales, Northern Ireland"], ["scotland", "Scotland"]])}
          ${select("studentLoanPlan", "Student loan", p.studentLoanPlan, Object.entries(state.taxSettings[p.taxYear].studentLoans).map(([key, value]) => [key, value.label]))}
        </details>
        <button class="btn btn-primary full" data-save-pay>Save pay details</button>
      </section>
      <section class="card">
        <h2>Estimated take-home pay</h2>
        <div class="grid">
          ${stat("Net monthly pay", moneyExact(result.netMonthly), "N", "blue")}
          ${stat("Gross yearly pay", moneyExact(result.grossYearly), "G", "teal")}
          ${stat("Income tax", moneyExact(result.incomeTax), "T", "amber")}
          ${stat("National Insurance", moneyExact(result.nationalInsurance), "N", "rose")}
        </div>
        <p class="small muted">This is an estimate. Actual deductions may vary depending on tax code, pension, student loan, benefits and employer payroll settings.</p>
      </section>
    </div>
  `;
}

function spendPage() {
  const totals = expenseTotals(state.expenses);
  return `
    ${pageHead("Spend", "Add what you spent. The app updates your totals and account balance.", `<button class="btn btn-primary" data-focus="expense-name">Add spending</button>`)}
    <div class="grid grid-2">
      <section class="card">
        <h2>Add spending</h2>
        ${input("expense-name", "What did you spend on?", "", "text", "Tesco grocery")}
        ${input("expense-amount", "Amount", "", "number", "25")}
        ${select("expense-category", "Category", "Food", state.categories.map((cat) => [cat, cat]))}
        ${select("expense-account", "Paid from", "", [["", "Choose account"], ...state.accounts.map((account) => [account.id, account.name])])}
        <details>
          <summary>More options</summary>
          ${input("expense-date", "Date", today(), "date")}
          ${select("expense-method", "Payment method", "Debit Card", paymentMethods.map((method) => [method, method]))}
        </details>
        <button class="btn btn-primary full" data-add-expense>Save spending</button>
      </section>
      <section class="card">
        <h2>Recent spending</h2>
        <div class="grid grid-3">
          ${stat("Today", moneyExact(totals.today), "T", "blue")}
          ${stat("This month", moneyExact(totals.month), "M", "amber")}
          ${stat("This year", moneyExact(totals.year), "Y", "teal")}
        </div>
        <div class="list">${state.expenses.slice().reverse().slice(0, 8).map(expenseItem).join("") || empty("No spending yet", "Add your first purchase.")}</div>
      </section>
    </div>
  `;
}

function budgetPage() {
  const progress = budgetProgress(state.budgets, state.expenses);
  return `
    ${pageHead("Monthly Budget", "Choose a category and set a simple monthly limit.")}
    <div class="grid grid-2">
      <section class="card">
        <h2>Create budget</h2>
        ${select("budget-category", "Category", "Food", state.categories.map((cat) => [cat, cat]))}
        ${input("budget-limit", "Monthly limit", "", "number", "250")}
        <button class="btn btn-primary full" data-add-budget>Create budget</button>
      </section>
      <section class="card">
        <h2>Your budgets</h2>
        <div class="list">${progress.map(budgetItem).join("") || empty("No budgets yet", "Start with Food, Shopping or Travel.")}</div>
      </section>
    </div>
  `;
}

function accountsPage() {
  const cash = state.accounts.filter((a) => a.type !== "credit_card").reduce((sum, a) => sum + a.balance, 0);
  const cards = state.accounts.filter((a) => a.type === "credit_card").reduce((sum, a) => sum + a.balance, 0);
  return `
    ${pageHead("Accounts", "Add bank accounts, cash, savings and credit cards.")}
    <div class="grid grid-2">
      <section class="card">
        <h2>Add account</h2>
        ${input("account-name", "Account name", "", "text", "Lloyds Bank")}
        ${select("account-type", "Account type", "current", [["current", "Current Account"], ["savings", "Savings"], ["cash", "Cash"], ["credit_card", "Credit Card"]])}
        ${input("account-balance", "Current balance", "", "number", "500")}
        <button class="btn btn-primary full" data-add-account>Add account</button>
      </section>
      <section class="card">
        <h2>Account list</h2>
        <div class="grid grid-2">${stat("Bank and cash", moneyExact(cash), "B", "blue")}${stat("Credit cards", moneyExact(cards), "C", "rose")}</div>
        <div class="list">${state.accounts.map(accountItem).join("") || empty("No accounts yet", "Add your first bank account or credit card.")}</div>
      </section>
    </div>
  `;
}

function morePage() {
  return `
    ${pageHead("More", "Bills, debts, reports, settings and help live here to keep the main app simple.")}
    <div class="grid grid-3">
      ${action("bills", "Bills", "Subscriptions and regular payments", "B", "amber")}
      ${action("debts", "Debts", "Credit cards and loans", "D", "rose")}
      ${action("reports", "Reports", "Simple spending charts", "R", "teal")}
      ${action("settings", "Settings", "Export, import and reset", "S", "violet")}
      ${action("help", "Help", "Plain-English guidance", "H", "blue")}
    </div>
  `;
}

function billsPage() {
  const monthly = state.subscriptions.reduce((sum, item) => sum + monthlySubscriptionAmount(item), 0);
  return `
    ${pageHead("Bills", "Track regular payments without cluttering the main dashboard.")}
    <div class="grid grid-2">
      <section class="card">
        <h2>Add bill</h2>
        ${input("bill-name", "Bill name", "", "text", "Netflix")}
        ${input("bill-amount", "Amount", "", "number", "12")}
        ${select("bill-frequency", "How often?", "monthly", [["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]])}
        ${input("bill-date", "Payment date", today(), "date")}
        <button class="btn btn-primary full" data-add-bill>Add bill</button>
      </section>
      <section class="card"><h2>Your bills</h2>${stat("Monthly total", moneyExact(monthly), "M", "amber")}<div class="list">${state.subscriptions.map(billItem).join("") || empty("No bills yet", "Add rent, phone, Netflix or insurance.")}</div></section>
    </div>
  `;
}

function debtsPage() {
  const total = state.debts.reduce((sum, item) => sum + item.amount, 0);
  return `
    ${pageHead("Debts", "Track credit cards, loans, due dates and minimum payments.")}
    <div class="grid grid-2">
      <section class="card">
        <h2>Add debt</h2>
        ${input("debt-name", "Debt name", "", "text", "Lloyds Credit Card")}
        ${input("debt-amount", "Total debt", "", "number", "500")}
        ${input("debt-minimum", "Minimum payment", "", "number", "25")}
        ${input("debt-date", "Due date", today(), "date")}
        <button class="btn btn-primary full" data-add-debt>Add debt</button>
      </section>
      <section class="card"><h2>Your debts</h2>${stat("Total debt", moneyExact(total), "D", "rose")}<div class="list">${state.debts.map(debtItem).join("") || empty("No debts yet", "Add cards, loans or buy-now-pay-later balances.")}</div></section>
    </div>
  `;
}

function reportsPage() {
  return `
    ${pageHead("Reports", "Simple charts that explain your money at a glance.")}
    <div class="grid grid-2">
      <section class="card"><h2>Spending by category</h2>${bars(categoryTotals(state.expenses), "No spending yet", "Add purchases to see a report.")}</section>
      <section class="card"><h2>Budget progress</h2>${budgetProgress(state.budgets, state.expenses).map((item) => progressLine(item.category, item.spent, item.limit)).join("") || empty("No budgets yet", "Create a budget first.")}</section>
    </div>
  `;
}

function settingsPage() {
  return `
    ${pageHead("Settings", "Keep this area simple: export, import or reset your local data.")}
    <section class="card">
      <div class="grid grid-3">
        <button class="btn btn-secondary" data-export>Download backup</button>
        <label class="btn btn-secondary">Import backup<input type="file" hidden data-import accept="application/json"></label>
        <button class="btn btn-danger" data-reset>Reset all data</button>
      </div>
    </section>
  `;
}

function helpPage() {
  return `
    ${pageHead("Help", "Use the app one step at a time.")}
    <div class="grid grid-3">
      ${helpCard("Start with Pay", "Enter hourly rate and weekly hours so the dashboard can estimate income.")}
      ${helpCard("Add Accounts", "Add your bank account or credit card before recording spending.")}
      ${helpCard("Set a Budget", "Pick one category like Food and choose a limit for the month.")}
    </div>
    <section class="card"><h2>Hosting note</h2><p class="muted">This version is static and host-ready. Upload the money-mate-static folder to Netlify, Vercel, GitHub Pages or any static host.</p></section>
  `;
}

function render() {
  if (!session) {
    app.innerHTML = authPage();
    bindAuth();
    return;
  }
  const pages = { dashboard: dashboardPage, pay: payPage, spend: spendPage, budget: budgetPage, accounts: accountsPage, more: morePage, bills: billsPage, debts: debtsPage, reports: reportsPage, settings: settingsPage, help: helpPage };
  app.innerHTML = shell((pages[route] || dashboardPage)());
  bindApp();
}

function bindAuth() {
  document.querySelector("[data-auth-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const mode = event.submitter?.dataset.mode || authMode;
    const email = document.querySelector("#auth-email").value;
    const name = document.querySelector("#auth-name")?.value || "";
    document.querySelector("#auth-error").textContent = "";
    try {
      if (mode === "reset") {
        await requestPasswordReset(email);
        authMode = "login";
        authMessage = "If this email has an account, a secure reset link has been sent.";
        render();
      } else if (mode === "register") {
        const password = document.querySelector("#auth-password").value;
        await register(name, email, password);
        authMode = "login";
        authMessage = "Account created. Please log in with your email and password.";
        render();
      } else {
        const password = document.querySelector("#auth-password").value;
        session = await login(email, password);
        state = loadData(session.id);
        authMessage = "";
        render();
      }
    } catch (error) {
      document.querySelector("#auth-error").textContent = error.message;
    }
  });
  document.querySelectorAll("[data-auth-switch]").forEach((button) => {
    button.addEventListener("click", () => {
      authMode = button.dataset.authSwitch;
      authMessage = "";
      render();
    });
  });
}

function bindApp() {
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => setRoute(button.dataset.route)));
  document.querySelectorAll("[data-action='logout']").forEach((button) => button.addEventListener("click", () => { logout(); session = null; state = null; render(); }));
  document.querySelector("[data-save-pay]")?.addEventListener("click", savePay);
  document.querySelector("[data-add-account]")?.addEventListener("click", addAccount);
  document.querySelector("[data-add-expense]")?.addEventListener("click", addExpense);
  document.querySelector("[data-add-budget]")?.addEventListener("click", addBudget);
  document.querySelector("[data-add-bill]")?.addEventListener("click", addBill);
  document.querySelector("[data-add-debt]")?.addEventListener("click", addDebt);
  document.querySelector("[data-export]")?.addEventListener("click", exportData);
  document.querySelector("[data-import]")?.addEventListener("change", importData);
  document.querySelector("[data-reset]")?.addEventListener("click", resetData);
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteItem(button.dataset.type, button.dataset.delete)));
  document.querySelector("[data-focus]")?.addEventListener("click", (event) => document.querySelector(`#${event.currentTarget.dataset.focus}`)?.focus());
  document.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener("focus", () => {
      if (input.value === "0") input.value = "";
    });
  });
}

function savePay() {
  ["hourlyRate", "hoursPerWeek", "overtimeHours", "overtimeRate", "pensionPercentage"].forEach((key) => (state.payroll[key] = Number(document.querySelector(`#${key}`).value || 0)));
  state.payroll.region = document.querySelector("#region").value;
  state.payroll.studentLoanPlan = document.querySelector("#studentLoanPlan").value;
  persist();
  flash("Pay details saved.");
}

function addAccount() {
  const name = value("account-name");
  if (!name) return alert("Enter an account name.");
  state.accounts.push({ id: makeId(), name, type: value("account-type"), balance: number("account-balance"), createdAt: new Date().toISOString() });
  persist();
  flash("Account added.");
}

function addExpense() {
  const name = value("expense-name");
  const amount = number("expense-amount");
  const accountId = value("expense-account");
  if (!name) return alert("Enter what you spent on.");
  if (amount <= 0) return alert("Enter an amount above £0.");
  if (!accountId) return alert("Choose the account you paid from.");
  const expense = { id: makeId(), name, amount, category: value("expense-category"), accountId, date: value("expense-date") || today(), paymentMethod: value("expense-method") || "Debit Card", createdAt: new Date().toISOString() };
  state.expenses.push(expense);
  state.accounts = state.accounts.map((account) => account.id === accountId ? { ...account, balance: account.type === "credit_card" ? account.balance + amount : account.balance - amount } : account);
  persist();
  flash("Spending saved.");
}

function addBudget() {
  const category = value("budget-category");
  const limit = number("budget-limit");
  if (limit <= 0) return alert("Enter a monthly budget above £0.");
  if (state.budgets.some((item) => item.category === category)) return alert("This category already has a budget.");
  state.budgets.push({ id: makeId(), category, limit, createdAt: new Date().toISOString() });
  persist();
  flash("Budget created.");
}

function addBill() {
  const name = value("bill-name");
  const amount = number("bill-amount");
  if (!name || amount <= 0) return alert("Enter a bill name and amount.");
  state.subscriptions.push({ id: makeId(), name, amount, frequency: value("bill-frequency"), paymentDate: value("bill-date") || today(), status: "active", createdAt: new Date().toISOString() });
  persist();
  flash("Bill added.");
}

function addDebt() {
  const name = value("debt-name");
  const amount = number("debt-amount");
  if (!name || amount <= 0) return alert("Enter a debt name and amount.");
  state.debts.push({ id: makeId(), name, amount, minimumPayment: number("debt-minimum"), dueDate: value("debt-date") || today(), status: "unpaid", createdAt: new Date().toISOString() });
  persist();
  flash("Debt added.");
}

function deleteItem(type, id) {
  if (!confirm("Delete this item? This cannot be undone.")) return;
  const map = { account: "accounts", expense: "expenses", budget: "budgets", bill: "subscriptions", debt: "debts" };
  state[map[type]] = state[map[type]].filter((item) => item.id !== id);
  persist();
  flash("Item deleted.");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "money-mate-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = { ...state, ...JSON.parse(reader.result) };
      persist();
      flash("Backup imported.");
    } catch {
      alert("Choose a valid Money Mate backup file.");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("Reset all your data?")) return;
  state = { ...state, accounts: [], expenses: [], budgets: [], subscriptions: [], debts: [], payroll: { ...defaultPayroll }, categories: [...defaultCategories] };
  persist();
  flash("Data reset.");
}

function authPage() {
  const isRegister = authMode === "register";
  const isReset = authMode === "reset";
  const title = isRegister ? "Create your account" : isReset ? "Reset password" : "Welcome back";
  const intro = isRegister
    ? "Add your name, email and password. After creating the account, log in again."
    : isReset
      ? "Enter your email. Your password will only change through a verified reset link."
      : "Log in with your email and password to see your saved money data.";
  return `
    <main class="auth-page">
      <section class="auth-card">
        <div class="center">
          <div class="brand-mark">M</div>
          <p class="eyebrow">Money Mate</p>
          <h1>${title}</h1>
          <p class="muted">${intro}</p>
        </div>
        <form data-auth-form>
          <p id="auth-error" class="error" aria-live="polite"></p>
          ${authMessage ? `<p class="success">${authMessage}</p>` : ""}
          ${isRegister ? input("auth-name", "Your name", "", "text", "for example: Amit Patel") : ""}
          ${input("auth-email", "Email address", "", "email", "you@example.com")}
          ${isReset ? "" : input("auth-password", "Password", "", "password", "Your password")}
          <button class="btn btn-primary full" type="submit" data-mode="${isRegister ? "register" : isReset ? "reset" : "login"}">${isRegister ? "Create account" : isReset ? "Send reset link" : "Log in"}</button>
          ${!isRegister && !isReset ? `<button class="btn btn-ghost full" type="button" data-auth-switch="reset">Forgot password?</button>` : ""}
          <div class="divider">or</div>
          <button class="btn btn-secondary full" type="button" data-auth-switch="${isRegister || isReset ? "login" : "register"}">${isRegister || isReset ? "Back to login" : "Create new account"}</button>
        </form>
        <p class="small muted">For production, connect Firebase or Supabase so users can access data across devices.</p>
      </section>
    </main>
  `;
}

function stat(label, value, icon, tone) {
  return `<div class="stat"><div class="icon ${tone}">${icon}</div><div><p class="small muted">${label}</p><h3>${value}</h3></div></div>`;
}

function action(route, title, text, icon, tone) {
  return `<button class="action-card" data-route="${route}"><span class="icon ${tone}">${icon}</span><h3>${title}</h3><p class="muted small">${text}</p></button>`;
}

function input(id, label, value = "", type = "text", placeholder = "") {
  const displayValue = type === "number" && Number(value) === 0 ? "" : value;
  return `<div class="field-group"><label for="${id}">${label}</label><input class="field" id="${id}" type="${type}" value="${escapeHtml(String(displayValue))}" placeholder="${placeholder}"></div>`;
}

function select(id, label, value, options) {
  return `<div class="field-group"><label for="${id}">${label}</label><select class="field" id="${id}">${options.map(([key, text]) => `<option value="${key}" ${key === value ? "selected" : ""}>${text}</option>`).join("")}</select></div>`;
}

function expenseItem(item) {
  return `<div class="list-item"><div><strong>${escapeHtml(item.name)}</strong><p class="muted small">${item.category} · ${item.date}</p></div><div><strong>${moneyExact(item.amount)}</strong><button class="btn btn-danger" data-delete="${item.id}" data-type="expense">Delete</button></div></div>`;
}

function budgetItem(item) {
  return `<div class="list-item"><div style="flex:1">${progressLine(item.category, item.spent, item.limit)}</div><button class="btn btn-danger" data-delete="${item.id}" data-type="budget">Delete</button></div>`;
}

function accountItem(item) {
  return `<div class="list-item"><div><strong>${escapeHtml(item.name)}</strong><p class="muted small">${item.type.replace("_", " ")}</p></div><div><strong>${moneyExact(item.balance)}</strong><button class="btn btn-danger" data-delete="${item.id}" data-type="account">Delete</button></div></div>`;
}

function billItem(item) {
  return `<div class="list-item"><div><strong>${escapeHtml(item.name)}</strong><p class="muted small">${item.frequency} · ${item.paymentDate}</p></div><div><strong>${moneyExact(item.amount)}</strong><button class="btn btn-danger" data-delete="${item.id}" data-type="bill">Delete</button></div></div>`;
}

function debtItem(item) {
  return `<div class="list-item"><div><strong>${escapeHtml(item.name)}</strong><p class="muted small">Due ${item.dueDate} · Min ${moneyExact(item.minimumPayment)}</p></div><div><strong>${moneyExact(item.amount)}</strong><button class="btn btn-danger" data-delete="${item.id}" data-type="debt">Delete</button></div></div>`;
}

function bars(items, emptyTitle, emptyText) {
  if (!items.length) return empty(emptyTitle, emptyText);
  const max = Math.max(...items.map((item) => item.value), 1);
  return `<div class="bars">${items.map((item) => `<div class="bar-row"><strong>${item.name}</strong><div class="bar-track"><span style="width:${Math.max(4, (item.value / max) * 100)}%"></span></div><span>${money(item.value)}</span></div>`).join("")}</div>`;
}

function progressLine(label, spent, limit) {
  const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const left = limit - spent;
  return `<div><div style="display:flex;justify-content:space-between;gap:12px"><strong>${label}</strong><span class="small ${left < 0 ? "danger-text" : ""}">${left < 0 ? "Over budget" : `${money(left)} left`}</span></div><div class="progress"><span style="width:${percent}%;background:${left < 0 ? "var(--danger)" : percent > 80 ? "var(--warning)" : "var(--primary)"}"></span></div><p class="small muted">Spent ${moneyExact(spent)} of ${moneyExact(limit)}</p></div>`;
}

function helpCard(title, text) {
  return `<section class="card"><span class="icon blue">?</span><h3>${title}</h3><p class="muted">${text}</p></section>`;
}

function empty(title, text) {
  return `<div class="empty"><strong>${title}</strong><p class="muted small">${text}</p></div>`;
}

function value(id) {
  return document.querySelector(`#${id}`)?.value.trim() || "";
}

function number(id) {
  return Number(document.querySelector(`#${id}`)?.value || 0);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

render();
