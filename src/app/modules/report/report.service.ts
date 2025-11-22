import { getTenantModel } from '../../utils/getTenantModels';

const getMonthlyIncomeReport = async (tenantDomain: string) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  // Aggregation to group income by year + month
  const result = await Income.aggregate([
    {
      $addFields: {
        parsedDate: { $toDate: '$date' },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$parsedDate' },
          month: { $month: '$parsedDate' },
        },
        totalIncome: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  return result.map((r: any) => ({
    year: r._id.year,
    month: r._id.month,
    totalIncome: r.totalIncome,
    count: r.count,
  }));
};

const getYearlyIncomeReport = async (tenantDomain: string) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  const result = await Income.aggregate([
    {
      $addFields: {
        parsedDate: { $toDate: '$date' },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$parsedDate' } },
        totalIncome: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1 },
    },
  ]);

  return result.map((r: any) => ({
    year: r._id.year,
    totalIncome: r.totalIncome,
    count: r.count,
  }));
};

const getTotalIncomeReport = async (tenantDomain: string) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  const result = await Income.aggregate([
    {
      $group: {
        _id: null,
        totalIncome: { $sum: '$totalAmount' },
        totalCount: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0
    ? {
        totalIncome: result[0].totalIncome,
        totalCount: result[0].totalCount,
      }
    : { totalIncome: 0, totalCount: 0 };
};

export const reportServices = {
  getMonthlyIncomeReport,
  getYearlyIncomeReport,
  getTotalIncomeReport,
};
