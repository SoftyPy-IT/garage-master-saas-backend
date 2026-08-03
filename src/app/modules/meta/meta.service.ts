import QueryBuilder from '../../builder/QueryBuilder';
import { formatToBDComma } from '../../utils/formateComma';
import { getTenantModel } from '../../utils/getTenantModels';
import { redisClient } from '../../utils/redis';
import { CompanyType, CustomerType, ShowRoomType } from './meta.interface';
import { buildSearchQuery } from './meta.search';
import dayjs from 'dayjs';

const CACHE_TTL = 5;

const MONTH_NAMES = [
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

const toNumber = (value: unknown): number => Number(value) || 0;

const sumIncomeRecord = (income: Record<string, unknown>) => {
  const serviceIncome = toNumber(income.serviceIncomeAmount);
  const partsIncome = toNumber(income.partsIncomeAmount);
  const totalOtherIncome = toNumber(income.totalOtherIncome);
  const totalInvoiceIncome =
    income.totalInvoiceIncome != null
      ? toNumber(income.totalInvoiceIncome)
      : serviceIncome + partsIncome;
  const totalAmount =
    income.totalAmount != null
      ? toNumber(income.totalAmount)
      : totalInvoiceIncome + totalOtherIncome;

  return {
    serviceIncome,
    partsIncome,
    totalOtherIncome,
    totalInvoiceIncome,
    totalAmount,
  };
};

const sumExpenseRecord = (expense: Record<string, unknown>) => {
  const invoiceCost = toNumber(expense.invoiceCost);
  const totalOtherExpense = toNumber(expense.totalOtherExpense);
  const totalAmount =
    expense.totalAmount != null
      ? toNumber(expense.totalAmount)
      : invoiceCost + totalOtherExpense;

  return { invoiceCost, totalOtherExpense, totalAmount };
};

const sumManualIncomeRecords = (incomes: Record<string, unknown>[]) => {
  let serviceIncome = 0;
  let partsIncome = 0;
  let totalOtherIncome = 0;

  for (const income of incomes) {
    if (income.invoice_id) continue;

    const amounts = sumIncomeRecord(income);
    serviceIncome += amounts.serviceIncome;
    partsIncome += amounts.partsIncome;
    totalOtherIncome += amounts.totalOtherIncome;
  }

  return { serviceIncome, partsIncome, totalOtherIncome };
};

const sumInvoiceIncomeRecords = (invoices: Record<string, unknown>[]) => {
  let serviceIncome = 0;
  let partsIncome = 0;
  let totalInvoiceIncome = 0;

  for (const invoice of invoices) {
    serviceIncome += toNumber(invoice.service_total);
    partsIncome += toNumber(invoice.parts_total);
    totalInvoiceIncome += toNumber(invoice.net_total);
  }

  return { serviceIncome, partsIncome, totalInvoiceIncome };
};

const countTotalProducts = async (tenantDomain: string): Promise<number> => {
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Stock } = await getTenantModel(tenantDomain, 'Stock');
  const { Model: WarehouseStock } = await getTenantModel(
    tenantDomain,
    'WarehouseStock',
  );

  const activeProductCount = await Product.countDocuments({
    isDeleted: { $ne: true },
  });
  if (activeProductCount > 0) return activeProductCount;

  const stockProductIds = await Stock.distinct('product');
  if (stockProductIds.length > 0) return stockProductIds.length;

  const warehouseProductIds = await WarehouseStock.distinct('product');
  return warehouseProductIds.length;
};

const buildStringDateMatch = (month?: number, year?: number) => {
  if (!month && !year) return {};
  if (month && year) {
    const monthStr = String(month).padStart(2, '0');
    return { date: { $regex: `^${year}-${monthStr}-` } };
  }
  if (year) {
    return { date: { $regex: `^${year}-` } };
  }
  return {};
};

const buildSalaryMatch = (month?: number, year?: number) => {
  const match: Record<string, string> = {};
  if (month) match.month_of_salary = MONTH_NAMES[month - 1];
  if (year) match.year_of_salary = String(year);
  return match;
};

const buildDonationMatch = (month?: number, year?: number) => {
  if (!month && !year) return {};
  const expr: Record<string, unknown>[] = [];
  if (month) expr.push({ $eq: [{ $month: '$createdAt' }, month] });
  if (year) expr.push({ $eq: [{ $year: '$createdAt' }, year] });
  if (expr.length === 1) return { $expr: expr[0] };
  return { $expr: { $and: expr } };
};

const generateCacheKey = (
  tenantDomain: string,
  functionName: string,
  query: Record<string, unknown>,
): string => {
  const queryString = JSON.stringify(query);
  return `meta:${tenantDomain}:${functionName}:${Buffer.from(queryString).toString('base64')}`;
};

// Helper function to invalidate related cache keys
const invalidateMetaCache = async (tenantDomain: string): Promise<void> => {
  const patterns = [
    `meta:${tenantDomain}:getAllCustomer:*`,
    `meta:${tenantDomain}:getAllMetaFromDB:*`,
    `meta:${tenantDomain}:calculateAccountingSummary:*`,
  ];

  for (const pattern of patterns) {
    await redisClient.delPattern(pattern);
  }
};

const getAllCustomer = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const cacheKey = generateCacheKey(tenantDomain, 'getAllCustomer', query);

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.error('Redis cache read error:', error);
  }

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  let searchTerm = query.searchTerm as string;
  if (searchTerm) {
    searchTerm = searchTerm.trim();
    if (searchTerm.startsWith('+')) {
      searchTerm = searchTerm.substring(1).trim();
    }
  }

  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Quotation } = await getTenantModel(tenantDomain, 'Quotation');
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  const customerSearchFields = [
    'customerId',
    'customer_name',
    'customer_contact',
    'customer_address',
    'driver_name',
    'driver_contact',
    'vehicle_username',
    'reference_name',
    'user_type',
    'contact',
    'fullCustomerNum',
    'fullRegNums',
  ];
  const companySearchFields = [
    'companyId',
    'company_name',
    'company_contact',
    'company_address',
    'driver_name',
    'driver_contact',
    'vehicle_username',
    'reference_name',
    'user_type',
    'contact',
    'fullCompanyNum',
    'fullRegNums',
  ];
  const showroomSearchFields = [
    'showRoomId',
    'showRoom_name',
    'company_contact',
    'showRoom_address',
    'driver_name',
    'driver_contact',
    'vehicle_username',
    'reference_name',
    'user_type',
    'contact',
    'fullCompanyNum',
    'fullRegNums',
  ];
  const vehicleSearchFields = [
    'vehicles.fullRegNum',
    'vehicles.car_registration_no',
  ];

  const allSearchFields = [
    ...customerSearchFields,
    ...companySearchFields,
    ...showroomSearchFields,
    ...vehicleSearchFields,
  ];

  let isRecycledFilter: boolean | undefined = undefined;
  if (query.isRecycled !== undefined) {
    if (typeof query.isRecycled === 'string') {
      isRecycledFilter = query.isRecycled === 'true';
    } else if (typeof query.isRecycled === 'boolean') {
      isRecycledFilter = query.isRecycled;
    }
  }

  let searchQuery = buildSearchQuery(allSearchFields, searchTerm);

  searchQuery = {
    ...searchQuery,
    ...(isRecycledFilter !== undefined ? { isRecycled: isRecycledFilter } : {}),
  };

  const customerQuery = new QueryBuilder(Customer.find(searchQuery), query);
  const companyQuery = new QueryBuilder(Company.find(searchQuery), query);
  const showroomQuery = new QueryBuilder(ShowRoom.find(searchQuery), query);

  const [customerCount, companyCount, showroomCount] = await Promise.all([
    customerQuery.countTotal(),
    companyQuery.countTotal(),
    showroomQuery.countTotal(),
  ]);

  const populateOptions = [
    {
      path: 'vehicles',
      model: Vehicle,
      select: 'fullRegNum car_registration_no carReg_no',
    },
    {
      path: 'quotations',
      model: Quotation,
    },
    {
      path: 'jobCards',
      model: JobCard,
    },
  ];

  const [customers, companies, showrooms] = await Promise.all([
    customerQuery.modelQuery.populate(populateOptions).lean<CustomerType[]>(),
    companyQuery.modelQuery.populate(populateOptions).lean<CompanyType[]>(),
    showroomQuery.modelQuery.populate(populateOptions).lean<ShowRoomType[]>(),
  ]);

  const unifiedData = [
    ...customers.map((customer) => ({
      _id: customer._id,
      id: customer.customerId,
      userType: customer.user_type,
      name: customer.customer_name,
      vehicles: customer.vehicles,
      jobCards: customer.jobCards,
      quotations: customer.quotations,
      invoices: customer.invoices,
      moneyReceipts: customer.money_receipts,
      address: customer.customer_address,
      contact: customer.fullCustomerNum,
      countryCode: customer.customer_country_code,
      email: customer.customer_email,
      driverName: customer.driver_name,
      driverContact: customer.driver_contact,
      driverCountryCode: customer.driver_country_code,
      vehicle_username: customer.vehicle_username,
      referenceName: customer.reference_name,
      isRecycled: customer.isRecycled,
      recycledAt: customer.recycledAt,
      createdAt: customer.createdAt,
      searchableId: customer.customerId,
      searchableName: customer.customer_name,
      searchableContact: `${customer.customer_country_code}${customer.customer_contact}`,
      searchableVehicle: customer.vehicles
        .map((v: any) => v.fullRegNum)
        .join(', '),
      fullRegNums: customer.vehicles.map((v: any) => v.fullRegNum).join(', '),
      type: 'customer',
    })),
    ...companies.map((company) => ({
      _id: company._id,
      id: company.companyId,
      userType: company.user_type,
      name: company.company_name,
      vehicles: company.vehicles,
      jobCards: company.jobCards,
      quotations: company.quotations,
      invoices: company.invoices,
      moneyReceipts: company.money_receipts,
      address: company.company_address,
      contact: company.fullCompanyNum,
      countryCode: company.company_country_code,
      email: company.company_email,
      driverName: company.driver_name,
      driverContact: company.driver_contact,
      driverCountryCode: company.driver_country_code,
      vehicle_username: company.vehicle_username,
      referenceName: company.reference_name,
      isRecycled: company.isRecycled,
      recycledAt: company.recycledAt,
      searchableId: company.companyId,
      createdAt: company.createdAt,
      searchableName: company.company_name,
      searchableContact: `${company.company_country_code}${company.company_contact}`,
      searchableVehicle: company.vehicles
        .map((v: any) => v.fullRegNum)
        .join(', '),
      fullRegNums: company.vehicles.map((v: any) => v.fullRegNum).join(', '),
      type: 'company',
    })),
    ...showrooms.map((showroom) => ({
      _id: showroom._id,
      id: showroom.showRoomId,
      userType: showroom.user_type,
      name: showroom.showRoom_name,
      vehicles: showroom.vehicles,
      jobCards: showroom.jobCards,
      quotations: showroom.quotations,
      invoices: showroom.invoices,
      moneyReceipts: showroom.money_receipts,
      address: showroom.showRoom_address,
      contact: showroom.fullCompanyNum,
      countryCode: showroom.company_country_code,
      email: showroom.company_email,
      driverName: showroom.driver_name,
      driverContact: showroom.driver_contact,
      driverCountryCode: showroom.driver_country_code,
      vehicle_username: showroom.vehicle_username,
      referenceName: showroom.reference_name,
      isRecycled: showroom.isRecycled,
      recycledAt: showroom.recycledAt,
      searchableId: showroom.showRoomId,
      searchableName: showroom.showRoom_name,
      createdAt: showroom.createdAt,
      searchableContact: `${showroom.company_country_code}${showroom.company_contact}`,
      searchableVehicle: showroom.vehicles
        .map((v: any) => v.fullRegNum)
        .join(', '),
      fullRegNums: showroom.vehicles.map((v: any) => v.fullRegNum).join(', '),
      type: 'showroom',
    })),
  ];

  const sortedData = unifiedData.sort((a, b) => {
    const sortOrder = query.sort === 'asc' ? 1 : -1;
    if (a.createdAt && b.createdAt) {
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        sortOrder
      );
    }
    return a.name.localeCompare(b.name) * sortOrder;
  });

  const paginatedData = sortedData.slice(skip, skip + limit);

  const result = {
    meta: {
      page,
      limit,
      total: sortedData.length,
      totalPage: Math.ceil(sortedData.length / limit),
    },
    data: paginatedData,
  };

  // Cache the result
  try {
    await redisClient.set(cacheKey, JSON.stringify(result), CACHE_TTL);
  } catch (error) {
    console.error('Redis cache write error:', error);
  }

  return result;
};

const getAllMetaFromDB = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {

  const cacheKey = generateCacheKey(tenantDomain, 'getAllMetaFromDB', query);

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {


  }

  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: Quotation } = await getTenantModel(tenantDomain, 'Quotation');
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');
  const { Model: User } = await getTenantModel(tenantDomain, 'User');

  const allCustomer = await Customer.find({ isRecycled: false }).lean();

  const totalProduct = await countTotalProducts(tenantDomain);
  const allCompany = await Company.find({ isRecycled: false }).lean();
  const allShowRoom = await ShowRoom.find({ isRecycled: false }).lean();
  const totalEntities =
    allCustomer.length + allCompany.length + allShowRoom.length;

  const totalJobCard = await JobCard.find({ isRecycled: false }).lean();
  const totalQuotation = await Quotation.find({ isRecycled: false }).lean();
  const totalInvoice = await Invoice.find({ isRecycled: false }).lean();
  const totalIncome = await Income.find().lean();
  const totalExpense = await Expense.find().lean();
  const tenantInfo = await User.find().lean();
  const subscription = tenantInfo[0]?.tenantInfo?.subscription;

  let subscriptionDetails = null;

  if (subscription) {
    const startDate = dayjs(subscription.startDate);
    const endDate = dayjs(subscription.endDate).endOf('day');
    const today = dayjs();

    const totalDays = endDate.diff(startDate, 'day');
    const daysRemaining = endDate.diff(today, 'day');

    subscriptionDetails = {
      ...subscription,
      totalDays: totalDays >= 0 ? totalDays : 0,
      daysRemaining: daysRemaining >= 0 ? daysRemaining : 0,
    };
  }

  const totalAmount = totalInvoice.reduce(
    (total, inv) => total + (inv.net_total || 0),
    0,
  );
  const totalAdvance = totalInvoice.reduce(
    (total, inv) => total + (inv.advance || 0),
    0,
  );
  const totalRemaining = totalAmount - totalAdvance;

  const formattedTotalAmount = formatToBDComma(totalAmount);
  const formattedTotalAdvance = formatToBDComma(totalAdvance);
  const formattedTotalRemaining = formatToBDComma(totalRemaining);

  let totalIncomeAmount = 0;
  let totalServiceIncome = 0;
  let totalPartsIncome = 0;
  let totalOtherIncome = 0;
  let totalInvoiceIncome = 0;

  const invoiceIncome = sumInvoiceIncomeRecords(totalInvoice);
  const manualIncome = sumManualIncomeRecords(totalIncome);

  totalServiceIncome = invoiceIncome.serviceIncome + manualIncome.serviceIncome;
  totalPartsIncome = invoiceIncome.partsIncome + manualIncome.partsIncome;
  totalOtherIncome = manualIncome.totalOtherIncome;
  totalInvoiceIncome =
    invoiceIncome.totalInvoiceIncome +
    manualIncome.serviceIncome +
    manualIncome.partsIncome;
  totalIncomeAmount = totalInvoiceIncome + totalOtherIncome;

  let totalExpenseAmount = 0;
  let totalInvoiceCost = 0;
  let totalOtherExpense = 0;

  for (const exp of totalExpense) {
    const amounts = sumExpenseRecord(exp);
    totalExpenseAmount += amounts.totalAmount;
    totalInvoiceCost += amounts.invoiceCost;
    totalOtherExpense += amounts.totalOtherExpense;
  }


  // Quotation status summary
  // Quotation summary
  const quotationSummary = await Quotation.aggregate([
    {
      $match: {
        isRecycled: false,
      },
    },
    {
      $group: {
        _id: null,

        running: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'running'] },
                  { $eq: ['$isPending', false] },
                ],
              },
              1,
              0,
            ],
          },
        },

        completed: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const statusSummary = quotationSummary[0] || {
    running: 0,
    completed: 0,
  };

  const incomes = {
    totalIncomeAmount,
    totalInvoiceIncome,
    totalOtherIncome,
    serviceIncomeAmount: totalServiceIncome,
    partsIncomeAmount: totalPartsIncome,
  };

  const expense = {
    totalExpenseAmount,
    totalInvoiceCost,
    totalOtherExpense,
  };


  const result = {
    statusSummary: {
      running: statusSummary.running,
      completed: statusSummary.completed,
    },
    totalProduct,
    totalCustomers: allCustomer.length,
    totalCompanies: allCompany.length,
    totalShowRooms: allShowRoom.length,
    totalEntities: totalEntities,
    totalJobCard: totalJobCard.length,
    totalQuotation: totalQuotation.length,

    totalInvoice: totalInvoice.length,
    totalAmount: formattedTotalAmount,
    totalAdvance: formattedTotalAdvance,
    totalRemaining: formattedTotalRemaining,
    subscriptionInfo: subscriptionDetails,
    incomes,
    expense,
  };

  // Cache the result with shorter TTL since this data changes more frequently
  try {
    await redisClient.set(cacheKey, JSON.stringify(result), 1);
  } catch (error) {
    console.error('Redis cache write error:', error);
  }

  return result;
};

const calculateAccountingSummary = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  // Generate cache key
  const cacheKey = generateCacheKey(
    tenantDomain,
    'calculateAccountingSummary',
    query,
  );

  // Try to get from cache first
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.error('Redis cache read error:', error);
  }

  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');
  const { Model: Donation } = await getTenantModel(tenantDomain, 'Donation');
  const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');

  const currentMonth = dayjs().month() + 1;
  const currentYear = dayjs().year();
  const month = query.month ? Number(query.month) : currentMonth;
  const year = query.year ? Number(query.year) : currentYear;

  const aggregateManualIncomeFields = async (Model: any, match: any = {}) => {
    const [result] = await Model.aggregate([
      {
        $match: {
          ...match,
          $or: [{ invoice_id: { $exists: false } }, { invoice_id: null }],
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: {
              $ifNull: [
                '$totalAmount',
                {
                  $add: [
                    { $ifNull: ['$serviceIncomeAmount', 0] },
                    { $ifNull: ['$partsIncomeAmount', 0] },
                    { $ifNull: ['$totalOtherIncome', 0] },
                  ],
                },
              ],
            },
          },
          serviceIncomeAmount: {
            $sum: { $ifNull: ['$serviceIncomeAmount', 0] },
          },
          partsIncomeAmount: {
            $sum: { $ifNull: ['$partsIncomeAmount', 0] },
          },
          totalOtherIncome: {
            $sum: { $ifNull: ['$totalOtherIncome', 0] },
          },
          totalInvoiceIncome: {
            $sum: {
              $ifNull: [
                '$totalInvoiceIncome',
                {
                  $add: [
                    { $ifNull: ['$serviceIncomeAmount', 0] },
                    { $ifNull: ['$partsIncomeAmount', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    return (
      result || {
        totalAmount: 0,
        serviceIncomeAmount: 0,
        partsIncomeAmount: 0,
        totalOtherIncome: 0,
        totalInvoiceIncome: 0,
      }
    );
  };

  const aggregateInvoiceIncomeFields = async (Model: any, match: any = {}) => {
    const [result] = await Model.aggregate([
      { $match: { isRecycled: false, ...match } },
      {
        $group: {
          _id: null,
          serviceIncomeAmount: {
            $sum: { $ifNull: ['$service_total', 0] },
          },
          partsIncomeAmount: {
            $sum: { $ifNull: ['$parts_total', 0] },
          },
          totalInvoiceIncome: {
            $sum: { $ifNull: ['$net_total', 0] },
          },
        },
      },
    ]);

    return (
      result || {
        serviceIncomeAmount: 0,
        partsIncomeAmount: 0,
        totalInvoiceIncome: 0,
      }
    );
  };

  const mergeIncomeResults = (
    manualIncome: Record<string, number>,
    invoiceIncome: Record<string, number>,
  ) => {
    const serviceIncomeAmount =
      (manualIncome.serviceIncomeAmount || 0) +
      (invoiceIncome.serviceIncomeAmount || 0);
    const partsIncomeAmount =
      (manualIncome.partsIncomeAmount || 0) +
      (invoiceIncome.partsIncomeAmount || 0);
    const totalOtherIncome = manualIncome.totalOtherIncome || 0;
    const totalInvoiceIncome =
      (invoiceIncome.totalInvoiceIncome || 0) +
      (manualIncome.serviceIncomeAmount || 0) +
      (manualIncome.partsIncomeAmount || 0);
    const totalAmount = totalInvoiceIncome + totalOtherIncome;

    return {
      serviceIncomeAmount,
      partsIncomeAmount,
      totalOtherIncome,
      totalInvoiceIncome,
      totalAmount,
    };
  };

  const aggregateExpenseFields = async (Model: any, match: any = {}) => {
    const [result] = await Model.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: {
              $ifNull: [
                '$totalAmount',
                {
                  $add: [
                    { $ifNull: ['$invoiceCost', 0] },
                    { $ifNull: ['$totalOtherExpense', 0] },
                  ],
                },
              ],
            },
          },
          totalOtherExpense: {
            $sum: { $ifNull: ['$totalOtherExpense', 0] },
          },
          invoiceCost: { $sum: { $ifNull: ['$invoiceCost', 0] } },
        },
      },
    ]);

    return (
      result || {
        totalAmount: 0,
        totalOtherExpense: 0,
        invoiceCost: 0,
      }
    );
  };

  const aggregateSalary = async (Model: any, match: any = {}) => {
    const [result] = await Model.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_payment: { $sum: { $ifNull: ['$total_payment', 0] } },
        },
      },
    ]);

    return { total_payment: result?.total_payment || 0 };
  };

  const aggregateDonation = async (Model: any, match: any = {}) => {
    const [result] = await Model.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          donation: { $sum: { $ifNull: ['$donation_amount', 0] } },
        },
      },
    ]);
    return result?.donation || 0;
  };

  const monthlyIncomeMatch = buildStringDateMatch(month, year);
  const yearlyIncomeMatch = buildStringDateMatch(undefined, year);
  const monthlySalaryMatch = buildSalaryMatch(month, year);
  const yearlySalaryMatch = buildSalaryMatch(undefined, year);
  const monthlyDonationMatch = buildDonationMatch(month, year);
  const yearlyDonationMatch = buildDonationMatch(undefined, year);

  const monthlyManualIncome = await aggregateManualIncomeFields(
    Income,
    monthlyIncomeMatch,
  );
  const yearlyManualIncome = await aggregateManualIncomeFields(
    Income,
    yearlyIncomeMatch,
  );
  const totalManualIncome = await aggregateManualIncomeFields(Income);

  const monthlyInvoiceIncome = await aggregateInvoiceIncomeFields(
    Invoice,
    monthlyIncomeMatch,
  );
  const yearlyInvoiceIncome = await aggregateInvoiceIncomeFields(
    Invoice,
    yearlyIncomeMatch,
  );
  const totalInvoiceIncome = await aggregateInvoiceIncomeFields(Invoice);

  const monthlyIncome = mergeIncomeResults(
    monthlyManualIncome,
    monthlyInvoiceIncome,
  );
  const yearlyIncome = mergeIncomeResults(yearlyManualIncome, yearlyInvoiceIncome);
  const totalIncome = mergeIncomeResults(totalManualIncome, totalInvoiceIncome);

  const monthlyExpense = await aggregateExpenseFields(
    Expense,
    monthlyIncomeMatch,
  );
  const yearlyExpense = await aggregateExpenseFields(
    Expense,
    yearlyIncomeMatch,
  );
  const totalExpense = await aggregateExpenseFields(Expense);

  const monthlySalary = await aggregateSalary(Salary, monthlySalaryMatch);
  const yearlySalary = await aggregateSalary(Salary, yearlySalaryMatch);
  const totalSalary = await aggregateSalary(Salary);

  const monthlyDonation = await aggregateDonation(
    Donation,
    monthlyDonationMatch,
  );
  const yearlyDonation = await aggregateDonation(
    Donation,
    yearlyDonationMatch,
  );
  const totalDonation = await aggregateDonation(Donation);

  // --- Net Profit ---
  const calcNetProfit = (
    income: any,
    expense: any,
    salary: any,
    donation: number,
  ) =>
    (income.totalAmount || 0) -
    ((expense.totalAmount || 0) + (salary.total_payment || 0) + donation);

  // --- Net Total Expense (sum of expense + salary + donation) ---
  const calcNetTotalExpense = (expense: any, salary: any, donation: number) =>
    (expense.totalAmount || 0) + (salary.total_payment || 0) + donation;

  const result = {
    income: {
      monthly: monthlyIncome,
      yearly: yearlyIncome,
      total: totalIncome,
    },
    expense: {
      monthly: monthlyExpense,
      yearly: yearlyExpense,
      total: totalExpense,
    },
    salary: {
      monthly: monthlySalary.total_payment,
      yearly: yearlySalary.total_payment,
      total: totalSalary.total_payment,
    },
    donation: {
      monthly: monthlyDonation,
      yearly: yearlyDonation,
      total: totalDonation,
    },
    netProfit: {
      monthly: calcNetProfit(
        monthlyIncome,
        monthlyExpense,
        monthlySalary,
        monthlyDonation,
      ),
      yearly: calcNetProfit(
        yearlyIncome,
        yearlyExpense,
        yearlySalary,
        yearlyDonation,
      ),
      total: calcNetProfit(
        totalIncome,
        totalExpense,
        totalSalary,
        totalDonation,
      ),
    },
    netTotalExpense: {
      monthly: calcNetTotalExpense(
        monthlyExpense,
        monthlySalary,
        monthlyDonation,
      ),
      yearly: calcNetTotalExpense(yearlyExpense, yearlySalary, yearlyDonation),
      total: calcNetTotalExpense(totalExpense, totalSalary, totalDonation),
    },
  };

  // Cache the result with shorter TTL for accounting data
  try {
    await redisClient.set(cacheKey, JSON.stringify(result), 120); // 2 minutes TTL
  } catch (error) {
    console.error('Redis cache write error:', error);
  }

  return result;
};

export const metServices = {
  getAllCustomer,
  getAllMetaFromDB,
  calculateAccountingSummary,
  invalidateMetaCache,
};
