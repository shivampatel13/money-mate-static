export const categories = [
  "Food",
  "Grocery",
  "Shopping",
  "Travel",
  "Rent",
  "Bills",
  "Subscription",
  "Entertainment",
  "Health",
  "Education",
  "Fuel",
  "Family",
  "Credit Card Payment",
  "Other",
];

export const paymentMethods = ["Debit Card", "Cash", "Credit Card", "Bank Transfer", "Direct Debit"];

export const defaultPayroll = {
  hourlyRate: 0,
  hoursPerWeek: 37.5,
  overtimeHours: 0,
  overtimeRate: 0,
  pensionPercentage: 0,
  studentLoanPlan: "none",
  region: "england_wales_ni",
  taxYear: "2026-2027",
};

export const taxSettings = {
  "2026-2027": {
    label: "2026/27",
    personalAllowance: 12570,
    personalAllowanceTaperStarts: 100000,
    regions: {
      england_wales_ni: [
        { label: "Basic", from: 0, to: 37700, rate: 0.2 },
        { label: "Higher", from: 37700, to: 125140, rate: 0.4 },
        { label: "Additional", from: 125140, to: null, rate: 0.45 },
      ],
      scotland: [
        { label: "Starter", from: 0, to: 3967, rate: 0.19 },
        { label: "Basic", from: 3967, to: 16956, rate: 0.2 },
        { label: "Intermediate", from: 16956, to: 31092, rate: 0.21 },
        { label: "Higher", from: 31092, to: 62430, rate: 0.42 },
        { label: "Advanced", from: 62430, to: 125140, rate: 0.45 },
        { label: "Top", from: 125140, to: null, rate: 0.48 },
      ],
    },
    nationalInsurance: {
      primaryThresholdWeekly: 242,
      upperEarningsLimitWeekly: 967,
      mainRate: 0.08,
      additionalRate: 0.02,
    },
    studentLoans: {
      none: { label: "No student loan", threshold: 999999999, rate: 0 },
      plan_1: { label: "Plan 1", threshold: 26900, rate: 0.09 },
      plan_2: { label: "Plan 2", threshold: 29385, rate: 0.09 },
      plan_4: { label: "Plan 4", threshold: 33795, rate: 0.09 },
      plan_5: { label: "Plan 5", threshold: 25000, rate: 0.09 },
      postgraduate: { label: "Postgraduate", threshold: 21000, rate: 0.06 },
    },
  },
};
