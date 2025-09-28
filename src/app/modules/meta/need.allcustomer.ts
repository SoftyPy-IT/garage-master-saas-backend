// import QueryBuilder from '../../builder/QueryBuilder';
// import { getTenantModel } from '../../utils/getTenantModels';
// import { CompanyType, CustomerType, ShowRoomType } from './meta.interface';
// import { buildSearchQuery } from './meta.search';
// import dayjs from 'dayjs';

// const formatToBDComma = (number: number) => {
//   return number.toLocaleString('en-IN', { minimumFractionDigits: 2 });
// };

// const getAllCustomer = async (
//   tenantDomain: string,
//   query: Record<string, unknown>,
// ) => {
//   const limit = query.limit ? Number(query.limit) : 10;
//   const page = query.page ? Number(query.page) : 1;
//   const skip = (page - 1) * limit;
//   let searchTerm = query.searchTerm as string;
//   if (searchTerm) {
//     searchTerm = searchTerm.trim();
//     if (searchTerm.startsWith('+')) {
//       searchTerm = searchTerm.substring(1).trim();
//     }
//   }

//   const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
//   const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
//   const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
//   const { Model: Quotation } = await getTenantModel(tenantDomain, 'Quotation');
//   const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
//   const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

//   const customerSearchFields = [
//     'customerId',
//     'customer_name',
//     'customer_contact',
//     'customer_address',
//     'driver_name',
//     'driver_contact',
//     'vehicle_username',
//     'reference_name',
//     'user_type',
//     'contact',
//     'fullCustomerNum',
//     'fullRegNums',
//   ];
//   const companySearchFields = [
//     'companyId',
//     'company_name',
//     'company_contact',
//     'company_address',
//     'driver_name',
//     'driver_contact',
//     'vehicle_username',
//     'reference_name',
//     'user_type',
//     'contact',
//     'fullCompanyNum',
//     'fullRegNums',
//   ];
//   const showroomSearchFields = [
//     'showRoomId',
//     'showRoom_name',
//     'company_contact',
//     'showRoom_address',
//     'driver_name',
//     'driver_contact',
//     'vehicle_username',
//     'reference_name',
//     'user_type',
//     'contact',
//     'fullCompanyNum',
//     'fullRegNums',
//   ];
//   const vehicleSearchFields = [
//     'vehicles.fullRegNum',
//     'vehicles.car_registration_no',
//   ];

//   const allSearchFields = [
//     ...customerSearchFields,
//     ...companySearchFields,
//     ...showroomSearchFields,
//     ...vehicleSearchFields,
//   ];

//   const searchQuery = buildSearchQuery(allSearchFields, searchTerm);

//   // const customerQuery = new QueryBuilder(Customer.find(searchQuery), query).filter();
//   // const companyQuery = new QueryBuilder(Company.find(searchQuery), query).filter();
//   // const showroomQuery = new QueryBuilder(ShowRoom.find(searchQuery), query).filter();
//   const customerQuery = new QueryBuilder(Customer.find(searchQuery), query);
//   const companyQuery = new QueryBuilder(Company.find(searchQuery), query);
//   const showroomQuery = new QueryBuilder(ShowRoom.find(searchQuery), query);

//   const [customerCount, companyCount, showroomCount] = await Promise.all([
//     customerQuery.countTotal(),
//     companyQuery.countTotal(),
//     showroomQuery.countTotal(),
//   ]);

//   const populateOptions = [
//     {
//       path: 'vehicles',
//       model: Vehicle,
//       select: 'fullRegNum car_registration_no',
//     },
//     {
//       path: 'quotations',
//       model: Quotation,
//     },
//     {
//       path: 'jobCards',
//       model: JobCard,
//     },
//   ];

//   const [customers, companies, showrooms] = await Promise.all([
//     customerQuery.modelQuery.populate(populateOptions).lean<CustomerType[]>(),
//     companyQuery.modelQuery.populate(populateOptions).lean<CompanyType[]>(),
//     showroomQuery.modelQuery.populate(populateOptions).lean<ShowRoomType[]>(),
//   ]);

//   const unifiedData = [
//     ...customers.map((customer) => ({
//       _id: customer._id,
//       id: customer.customerId,
//       userType: customer.user_type,
//       name: customer.customer_name,
//       vehicles: customer.vehicles,
//       jobCards: customer.jobCards,
//       quotations: customer.quotations,
//       invoices: customer.invoices,
//       moneyReceipts: customer.money_receipts,
//       address: customer.customer_address,
//       contact: customer.fullCustomerNum,
//       countryCode: customer.customer_country_code,
//       email: customer.customer_email,
//       driverName: customer.driver_name,
//       driverContact: customer.driver_contact,
//       driverCountryCode: customer.driver_country_code,
//       vehicle_username: customer.vehicle_username,
//       referenceName: customer.reference_name,
//       isRecycled: customer.isRecycled,
//       recycledAt: customer.recycledAt,
//       createdAt: customer.createdAt,
//       searchableId: customer.customerId,
//       searchableName: customer.customer_name,
//       searchableContact: `${customer.customer_country_code}${customer.customer_contact}`,
//       searchableVehicle: customer.vehicles
//         .map((v: any) => v.fullRegNum)
//         .join(', '),
//       fullRegNums: customer.vehicles.map((v: any) => v.fullRegNum).join(', '),
//       type: 'customer',
//     })),
//     ...companies.map((company) => ({
//       _id: company._id,
//       id: company.companyId,
//       userType: company.user_type,
//       name: company.company_name,
//       vehicles: company.vehicles,
//       jobCards: company.jobCards,
//       quotations: company.quotations,
//       invoices: company.invoices,
//       moneyReceipts: company.money_receipts,
//       address: company.company_address,
//       contact: company.fullCompanyNum,
//       countryCode: company.company_country_code,
//       email: company.company_email,
//       driverName: company.driver_name,
//       driverContact: company.driver_contact,
//       driverCountryCode: company.driver_country_code,
//       vehicle_username: company.vehicle_username,
//       referenceName: company.reference_name,
//       isRecycled: company.isRecycled,
//       recycledAt: company.recycledAt,
//       searchableId: company.companyId,
//       createdAt: company.createdAt,
//       searchableName: company.company_name,
//       searchableContact: `${company.company_country_code}${company.company_contact}`,
//       searchableVehicle: company.vehicles
//         .map((v: any) => v.fullRegNum)
//         .join(', '),
//       fullRegNums: company.vehicles.map((v: any) => v.fullRegNum).join(', '),
//       type: 'company',
//     })),
//     ...showrooms.map((showroom) => ({
//       _id: showroom._id,
//       id: showroom.showRoomId,
//       userType: showroom.user_type,
//       name: showroom.showRoom_name,
//       vehicles: showroom.vehicles,
//       jobCards: showroom.jobCards,
//       quotations: showroom.quotations,
//       invoices: showroom.invoices,
//       moneyReceipts: showroom.money_receipts,
//       address: showroom.showRoom_address,
//       contact: showroom.fullCompanyNum,
//       countryCode: showroom.company_country_code,
//       email: showroom.company_email,
//       driverName: showroom.driver_name,
//       driverContact: showroom.driver_contact,
//       driverCountryCode: showroom.driver_country_code,
//       vehicle_username: showroom.vehicle_username,
//       referenceName: showroom.reference_name,
//       isRecycled: showroom.isRecycled,
//       recycledAt: showroom.recycledAt,
//       searchableId: showroom.showRoomId,
//       searchableName: showroom.showRoom_name,
//       createdAt: showroom.createdAt,
//       searchableContact: `${showroom.company_country_code}${showroom.company_contact}`,
//       searchableVehicle: showroom.vehicles
//         .map((v: any) => v.fullRegNum)
//         .join(', '),
//       fullRegNums: showroom.vehicles.map((v: any) => v.fullRegNum).join(', '),
//       type: 'showroom',
//     })),
//   ];

//   // const sortedData = unifiedData.sort((a, b) => {
//   //   if (query.sort === 'asc') return a.name.localeCompare(b.name);
//   //   return b.name.localeCompare(a.name);
//   // });

//   // Sort by createdAt if available, otherwise fallback to name
//   const sortedData = unifiedData.sort((a, b) => {
//     const sortOrder = query.sort === 'asc' ? 1 : -1;
//     if (a.createdAt && b.createdAt) {
//       return (
//         (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
//         sortOrder
//       );
//     }
//     return a.name.localeCompare(b.name) * sortOrder;
//   });

//   const paginatedData = sortedData.slice(skip, skip + limit);

//   return {
//     meta: {
//       page,
//       limit,
//       total: sortedData.length,
//       totalPage: Math.ceil(sortedData.length / limit),
//     },
//     data: paginatedData,
//   };
// };

// const getAllMetaFromDB = async (
//   tenantDomain: string,
//   query: Record<string, unknown>,
// ) => {
//   const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
//   const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
//   const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
//   const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
//   const { Model: Quotation } = await getTenantModel(tenantDomain, 'Quotation');
//   const { Model: Invoice } = await getTenantModel(tenantDomain, 'Invoice');
//   const { Model: Income } = await getTenantModel(tenantDomain, 'Income');
//   const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');
//   const { Model: LeaveRequest } = await getTenantModel(
//     tenantDomain,
//     'LeaveRequest',
//   );
//   const { Model: User } = await getTenantModel(tenantDomain, 'User');

//   const allCustomer = await Customer.find({ isRecycled: false });
//   const allCompany = await Company.find({ isRecycled: false });
//   const allShowRoom = await ShowRoom.find({ isRecycled: false });
//   const totalJobCard = await JobCard.find({ isRecycled: false });
//   const totalQuotation = await Quotation.find({ isRecycled: false });
//   const totalInvoice = await Invoice.find({ isRecycled: false });
//   const totalIncome = await Income.find();
//   const totalExpense = await Expense.find();
//   const leave = await LeaveRequest.find();
//   const tenantInfo = await User.find();
//   const subscription = tenantInfo[0]?.tenantInfo?.subscription;

//   let subscriptionDetails = null;

//   if (subscription) {
//     const startDate = dayjs(subscription.startDate);
//     const endDate = dayjs(subscription.endDate).endOf('day');
//     const today = dayjs();

//     const totalDays = endDate.diff(startDate, 'day');
//     const daysRemaining = endDate.diff(today, 'day');

//     subscriptionDetails = {
//       ...subscription,
//       totalDays: totalDays >= 0 ? totalDays : 0,
//       daysRemaining: daysRemaining >= 0 ? daysRemaining : 0,
//     };
//   }

//   const totalAmount = totalInvoice.reduce(
//     (total, inv) => total + (inv.net_total || 0),
//     0,
//   );
//   const totalAdvance = totalInvoice.reduce(
//     (total, inv) => total + (inv.advance || 0),
//     0,
//   );
//   const totalRemaining = totalAmount - totalAdvance;

//   const formattedTotalAmount = formatToBDComma(totalAmount);
//   const formattedTotalAdvance = formatToBDComma(totalAdvance);
//   const formattedTotalRemaining = formatToBDComma(totalRemaining);

//   // calculate expense
//   const totalOtherExpense = totalExpense.reduce(
//     (sum, expense) => sum + (expense.totalOtherExpense || 0),
//     0,
//   );
//   // ✅ Calculate income totals
//   const totalIncomeAmount = totalIncome.reduce(
//     (sum, income) => sum + (income.totalAmount || 0),
//     0,
//   );

//   const totalServiceIncome = totalIncome.reduce(
//     (sum, income) => sum + (income.serviceIncomeAmount || 0),
//     0,
//   );

//   const totalPartsIncome = totalIncome.reduce(
//     (sum, income) => sum + (income.partsIncomeAmount || 0),
//     0,
//   );

//   const totalOtherIncome = totalIncome.reduce(
//     (sum, income) => sum + (income.totalOtherIncome || 0),
//     0,
//   );

//   const totalInvoiceIncome = totalIncome.reduce(
//     (sum, income) => sum + (income.totalInvoiceIncome || 0),
//     0,
//   );

//   const totalExpenseAmount = totalExpense.reduce(
//     (sum, exp) => sum + (exp.totalAmount || 0),
//     0,
//   );

//   const totalInvoiceCost = totalExpense.reduce(
//     (sum, exp) => sum + (exp.invoiceCost || 0),
//     0,
//   );

//   // ✅ Quotation status summary
//   const statusCounts = await Quotation.aggregate([
//     {
//       $match: {
//         status: { $in: ['running', 'completed'] },
//         isRecycled: false,
//       },
//     },
//     {
//       $group: {
//         _id: '$status',
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   const statusSummary = statusCounts.reduce(
//     (acc: Record<string, number>, { _id, count }) => {
//       acc[_id] = count;
//       return acc;
//     },
//     {},
//   );

//   const incomes = {
//     totalIncomeAmount,
//     totalInvoiceIncome,
//     totalOtherIncome,
//     serviceIncomeAmount: totalServiceIncome,
//     partsIncomeAmount: totalPartsIncome,
//   };

//   const expense = {
//     totalExpenseAmount,
//     totalInvoiceCost,
//     totalOtherExpense,
//   };

//   return {
//     statusSummary: {
//       running: statusSummary['running'] || 0,
//       completed: statusSummary['completed'] || 0,
//     },
//     totalCustomers: allCustomer.length,
//     totalCompanies: allCompany.length,
//     totalShowRooms: allShowRoom.length,
//     totalJobCard: totalJobCard.length,
//     totalQuotation: totalQuotation.length,
//     totalInvoice: totalInvoice.length,
//     totalAmount: formattedTotalAmount,
//     totalAdvance: formattedTotalAdvance,
//     totalRemaining: formattedTotalRemaining,
//     subscriptionInfo: subscriptionDetails,
//     incomes,
//     expense,
//   };
// };

// export const metServices = {
//   getAllCustomer,
//   getAllMetaFromDB,
// };
