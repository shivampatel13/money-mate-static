export const money = (value) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);

export const moneyExact = (value) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);

export const today = () => new Date().toISOString().slice(0, 10);

const parseDate = (value) => new Date(`${value}T00:00:00`);
const isThisMonth = (value) => {
  const date = parseDate(value);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

export function calculatePayroll(payroll, taxSettings) {
  const config = taxSettings[payroll.taxYear] || Object.values(taxSettings)[0];
  const grossWeekly = Number(payroll.hourlyRate) * Number(payroll.hoursPerWeek) + Number(payroll.overtimeHours) * Number(payroll.overtimeRate);
  const grossYearly = grossWeekly * 52;
  const grossMonthly = grossYearly / 12;
  const pension = grossYearly * (Number(payroll.pensionPercentage) / 100);
  const adjustedIncome = Math.max(0, grossYearly - pension);
  const taper = Math.max(0, adjustedIncome - config.personalAllowanceTaperStarts) / 2;
  const allowance = Math.max(0, config.personalAllowance - taper);
  const taxableIncome = Math.max(0, adjustedIncome - allowance);
  const incomeTax = config.regions[payroll.region].reduce((sum, band) => {
    const top = band.to ?? Number.POSITIVE_INFINITY;
    const inBand = Math.max(0, Math.min(taxableIncome, top) - band.from);
    return sum + inBand * band.rate;
  }, 0);
  const weeklyNiMain = Math.max(0, Math.min(grossWeekly, config.nationalInsurance.upperEarningsLimitWeekly) - config.nationalInsurance.primaryThresholdWeekly);
  const weeklyNiExtra = Math.max(0, grossWeekly - config.nationalInsurance.upperEarningsLimitWeekly);
  const nationalInsurance = (weeklyNiMain * config.nationalInsurance.mainRate + weeklyNiExtra * config.nationalInsurance.additionalRate) * 52;
  const loan = config.studentLoans[payroll.studentLoanPlan] || config.studentLoans.none;
  const studentLoan = Math.max(0, grossYearly - loan.threshold) * loan.rate;
  const netYearly = Math.max(0, grossYearly - pension - incomeTax - nationalInsurance - studentLoan);
  return { grossWeekly, grossMonthly, grossYearly, pension, incomeTax, nationalInsurance, studentLoan, netMonthly: netYearly / 12, netWeekly: netYearly / 52, netYearly };
}

export function expenseTotals(expenses) {
  const now = new Date();
  const todayKey = today();
  return expenses.reduce(
    (acc, expense) => {
      const date = parseDate(expense.date);
      if (expense.date === todayKey) acc.today += expense.amount;
      if (isThisMonth(expense.date)) acc.month += expense.amount;
      if (date.getFullYear() === now.getFullYear()) acc.year += expense.amount;
      return acc;
    },
    { today: 0, month: 0, year: 0 },
  );
}

export function monthlySubscriptionAmount(item) {
  if (item.frequency === "weekly") return (item.amount * 52) / 12;
  if (item.frequency === "yearly") return item.amount / 12;
  return item.amount;
}

export function categoryTotals(expenses) {
  return Object.entries(
    expenses.filter((expense) => isThisMonth(expense.date)).reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function budgetProgress(budgets, expenses) {
  const monthExpenses = expenses.filter((expense) => isThisMonth(expense.date));
  return budgets.map((budget) => {
    const spent = monthExpenses.filter((expense) => expense.category === budget.category).reduce((sum, expense) => sum + expense.amount, 0);
    const remaining = budget.limit - spent;
    const percent = budget.limit > 0 ? Math.min(100, Math.round((spent / budget.limit) * 100)) : 0;
    return { ...budget, spent, remaining, percent };
  });
}

export function summary(data) {
  const pay = calculatePayroll(data.payroll, data.taxSettings);
  const spending = expenseTotals(data.expenses);
  const billsMonthly = data.subscriptions.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + monthlySubscriptionAmount(item), 0);
  const debtTotal = data.debts.reduce((sum, debt) => sum + debt.amount, 0);
  const minimumDebt = data.debts.filter((debt) => debt.status !== "paid").reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const moneyOut = spending.month + billsMonthly + minimumDebt;
  return { pay, spending, billsMonthly, debtTotal, minimumDebt, moneyOut, remaining: pay.netMonthly - moneyOut };
}
