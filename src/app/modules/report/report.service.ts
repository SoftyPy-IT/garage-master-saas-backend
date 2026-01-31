import { getTenantModel } from '../../utils/getTenantModels';
import { MONTHS } from './report.utils';

// Monthly aggregation
const monthlyAggregate = async (
  Model: any,
  amountField: string,
  year: number,
) => {
  return Model.aggregate([
    {
      $addFields: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      },
    },
    { $match: { year } },
    { $group: { _id: '$month', total: { $sum: `$${amountField}` } } },
  ]);
};

// Yearly aggregation
const yearlyAggregate = async (
  Model: any,
  amountField: string,
  year: number,
) => {
  return Model.aggregate([
    { $addFields: { year: { $year: '$createdAt' } } },
    { $match: { year } },
    { $group: { _id: null, total: { $sum: `$${amountField}` } } },
  ]).then((res) => res[0]?.total || 0);
};

// -------------------------
// MAIN REPORT SERVICE
// -------------------------
export const getFinancialReportOrdered = async (
  tenantDomain: string,
  year: number,
) => {
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');

  // ----------------
  // 1️⃣ Invoice
  // ----------------
  const invoiceMonthlyAgg = await monthlyAggregate(Invoice, 'net_total', year);
  const invoiceYearly = await yearlyAggregate(Invoice, 'net_total', year);

  const invoiceMonthly = MONTHS.map((month, index) => {
    const m = index + 1;
    const total = invoiceMonthlyAgg.find((i) => i._id === m)?.total || 0;
    return { month: MONTHS[index], total };
  });

  // ----------------
  // 2️⃣ Income
  // ----------------
  const incomeMonthlyAgg = await monthlyAggregate(Income, 'totalAmount', year);
  const incomeYearly = await yearlyAggregate(Income, 'totalAmount', year);

  const incomeMonthly = MONTHS.map((month, index) => {
    const m = index + 1;
    const total = incomeMonthlyAgg.find((i) => i._id === m)?.total || 0;
    return { month: MONTHS[index], total };
  });

  // ----------------
  // 3️⃣ Expense
  // ----------------
  const expenseMonthlyAgg = await monthlyAggregate(
    Expense,
    'totalAmount',
    year,
  );
  const expenseYearly = await yearlyAggregate(Expense, 'totalAmount', year);

  const expenseMonthly = MONTHS.map((month, index) => {
    const m = index + 1;
    const total = expenseMonthlyAgg.find((i) => i._id === m)?.total || 0;
    return { month: MONTHS[index], total };
  });

  return {
    year,
    invoice: { monthly: invoiceMonthly, yearly: invoiceYearly },
    income: { monthly: incomeMonthly, yearly: incomeYearly },
    expense: { monthly: expenseMonthly, yearly: expenseYearly },
  };
};
