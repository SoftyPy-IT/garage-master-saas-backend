import { getTenantModel } from '../../utils/getTenantModels';

// report.utils.ts
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const getYearRange = (year: number) => {
  const start = new Date(year, 0, 1); // January 1st
  const end = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
  return { start, end };
};

// Add function to get available years from database
export const getAvailableYears = async (tenantDomain: string) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');

  // Get all unique years from Income and Invoice collections
  const incomeYears = await Income.aggregate([
    { $group: { _id: { $year: '$createdAt' } } },
  ]);

  const invoiceYears = await Invoice.aggregate([
    { $group: { _id: { $year: '$createdAt' } } },
  ]);

  const allYears = [
    ...incomeYears.map((item) => item._id),
    ...invoiceYears.map((item) => item._id),
  ];

  // Remove duplicates and sort
  const uniqueYears = [...new Set(allYears)].sort();

  return uniqueYears;
};
