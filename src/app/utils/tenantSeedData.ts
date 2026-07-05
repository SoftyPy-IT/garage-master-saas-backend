export interface IDefaultPage {
  name: string;
  category: string;
  path: string;
  route: string;
  status: string;
}

export interface IDefaultRole {
  name: string;
  type: 'admin' | 'manager' | 'employee' | 'user';
  description: string;
}

// default page 
export const DEFAULT_PAGES: IDefaultPage[] = [
  // Dashboard
  { name: 'Dashboard', category: 'Main', path: '/dashboard', route: '/dashboard', status: 'active' },

  // User & Role Management
  { name: 'User Management', category: 'User Management', path: '/dashboard/user-management', route: '/dashboard/user-management', status: 'active' },
  { name: 'Role Management', category: 'User Management', path: '/dashboard/role-management', route: '/dashboard/role-management', status: 'active' },
  { name: 'User Permission', category: 'User Management', path: '/dashboard/user-permission', route: '/dashboard/user-permission', status: 'active' },
  { name: 'Feature Access', category: 'User Management', path: '/dashboard/feature-access', route: '/dashboard/feature-access', status: 'active' },
  { name: 'Page Management', category: 'User Management', path: '/dashboard/page-management', route: '/dashboard/page-management', status: 'active' },
  { name: 'Profile', category: 'User Management', path: '/dashboard/profile', route: '/dashboard/profile', status: 'active' },
  { name: 'Update Profile', category: 'User Management', path: '/dashboard/profile-update', route: '/dashboard/profile-update', status: 'active' },
  { name: 'All User', category: 'User Management', path: '/dashboard/all-user', route: '/dashboard/all-user', status: 'active' },
  { name: 'All Tenant List', category: 'User Management', path: '/dashboard/all-tenant-list', route: '/dashboard/all-tenant-list', status: 'active' },
  { name: 'All User List', category: 'User Management', path: '/dashboard/all-user-list', route: '/dashboard/all-user-list', status: 'active' },
  { name: 'Contact Customer', category: 'User Management', path: '/dashboard/contact-customer', route: '/dashboard/contact-customer', status: 'active' },
  { name: 'Recycle Bin User', category: 'User Management', path: '/dashboard/recycle-bin-user-list', route: '/dashboard/recycle-bin-user-list', status: 'active' },
  { name: 'Role', category: 'User Management', path: '/dashboard/role', route: '/dashboard/role', status: 'active' },
  { name: 'Add Role', category: 'User Management', path: '/dashboard/add-role', route: '/dashboard/add-role', status: 'active' },
  { name: 'Update Role', category: 'User Management', path: '/dashboard/update-role', route: '/dashboard/update-role', status: 'active' },

  // Job Card
  { name: 'Create Job Card', category: 'Job Card', path: '/dashboard/create-job-card', route: '/dashboard/create-job-card', status: 'active' },
  { name: 'Job Card List', category: 'Job Card', path: '/dashboard/jobcard-list', route: '/dashboard/jobcard-list', status: 'active' },
  { name: 'Update Job Card', category: 'Job Card', path: '/dashboard/update-jobcard', route: '/dashboard/update-jobcard', status: 'active' },
  { name: 'Preview Job Card', category: 'Job Card', path: '/dashboard/preview', route: '/dashboard/preview', status: 'active' },
  { name: 'Recycle Bin Job Card', category: 'Job Card', path: '/dashboard/recycle-bin-jobcard-list', route: '/dashboard/recycle-bin-jobcard-list', status: 'active' },

  // Customer
  { name: 'Customer List', category: 'Customer', path: '/dashboard/customer-list', route: '/dashboard/customer-list', status: 'active' },
  { name: 'Add Customer', category: 'Customer', path: '/dashboard/add-customer', route: '/dashboard/add-customer', status: 'active' },
  { name: 'Update Customer', category: 'Customer', path: '/dashboard/update-customer', route: '/dashboard/update-customer', status: 'active' },
  { name: 'Customer Profile', category: 'Customer', path: '/dashboard/customer-profile', route: '/dashboard/customer-profile', status: 'active' },
  { name: 'All Customer', category: 'Customer', path: '/dashboard/all-customer', route: '/dashboard/all-customer', status: 'active' },
  { name: 'Recycle Bin Customer', category: 'Customer', path: '/dashboard/recycle-bin-customer-list', route: '/dashboard/recycle-bin-customer-list', status: 'active' },

  // Invoice
  { name: 'Create Invoice', category: 'Invoice', path: '/dashboard/create-invoice', route: '/dashboard/create-invoice', status: 'active' },
  { name: 'Invoice List', category: 'Invoice', path: '/dashboard/invoice-list', route: '/dashboard/invoice-list', status: 'active' },
  { name: 'Update Invoice', category: 'Invoice', path: '/dashboard/update-invoice', route: '/dashboard/update-invoice', status: 'active' },
  { name: 'Invoice View', category: 'Invoice', path: '/dashboard/invoice-view', route: '/dashboard/invoice-view', status: 'active' },
  { name: 'Recycle Bin Invoice', category: 'Invoice', path: '/dashboard/recycle-bin-invoice-list', route: '/dashboard/recycle-bin-invoice-list', status: 'active' },

  // Quotation
  { name: 'Create Quotation', category: 'Quotation', path: '/dashboard/create-quotation', route: '/dashboard/create-quotation', status: 'active' },
  { name: 'Quotation List', category: 'Quotation', path: '/dashboard/quotation-list', route: '/dashboard/quotation-list', status: 'active' },
  { name: 'Update Quotation', category: 'Quotation', path: '/dashboard/update-quotation', route: '/dashboard/update-quotation', status: 'active' },
  { name: 'Quotation View', category: 'Quotation', path: '/dashboard/quotation-view', route: '/dashboard/quotation-view', status: 'active' },
  { name: 'Recycle Bin Quotation', category: 'Quotation', path: '/dashboard/recycle-bin-quotation-list', route: '/dashboard/recycle-bin-quotation-list', status: 'active' },
  { name: 'Pending Quotation', category: 'Quotation', path: '/dashboard/pending-quotation', route: '/dashboard/pending-quotation', status: 'active' },

  // Money Receipt
  { name: 'Create Money Receipt', category: 'Money Receipt', path: '/dashboard/money-receive-create', route: '/dashboard/money-receive-create', status: 'active' },
  { name: 'Money Receipt List', category: 'Money Receipt', path: '/dashboard/money-receipt-list', route: '/dashboard/money-receipt-list', status: 'active' },
  { name: 'Update Money Receipt', category: 'Money Receipt', path: '/dashboard/money-receipt-update', route: '/dashboard/money-receipt-update', status: 'active' },
  { name: 'Money Receipt View', category: 'Money Receipt', path: '/dashboard/money-receipt-view', route: '/dashboard/money-receipt-view', status: 'active' },
  { name: 'Due Money Receipt', category: 'Money Receipt', path: '/dashboard/money-receipt-due', route: '/dashboard/money-receipt-due', status: 'active' },
  { name: 'Recycle Bin Money Receipt', category: 'Money Receipt', path: '/dashboard/recycle-bin-moneyreceipt-list', route: '/dashboard/recycle-bin-moneyreceipt-list', status: 'active' },

  // Employee
  { name: 'Employee List', category: 'Employee', path: '/dashboard/employee-list', route: '/dashboard/employee-list', status: 'active' },
  { name: 'Add Employee', category: 'Employee', path: '/dashboard/add-employee', route: '/dashboard/add-employee', status: 'active' },
  { name: 'Update Employee', category: 'Employee', path: '/dashboard/update-employee', route: '/dashboard/update-employee', status: 'active' },
  { name: 'Employee Profile', category: 'Employee', path: '/dashboard/employee-profile', route: '/dashboard/employee-profile', status: 'active' },
  { name: 'Employee Leave', category: 'Employee', path: '/dashboard/employee-leave', route: '/dashboard/employee-leave', status: 'active' },
  { name: 'Employee Attendance', category: 'Employee', path: '/dashboard/employee-attendance', route: '/dashboard/employee-attendance', status: 'active' },
  { name: 'Employee Salary', category: 'Employee', path: '/dashboard/employee-salary', route: '/dashboard/employee-salary', status: 'active' },
  { name: 'Update Employee Salary', category: 'Employee', path: '/dashboard/employee-salary-update', route: '/dashboard/employee-salary-update', status: 'active' },
  { name: 'Employee Overtime', category: 'Employee', path: '/dashboard/employee-overtime', route: '/dashboard/employee-overtime', status: 'active' },
  { name: 'Create Overtime', category: 'Employee', path: '/dashboard/create-overtime', route: '/dashboard/create-overtime', status: 'active' },
  { name: 'Recycle Bin Employee', category: 'Employee', path: '/dashboard/recycle-bin-employee-list', route: '/dashboard/recycle-bin-employee-list', status: 'active' },
  { name: 'Add Salary', category: 'Employee', path: '/dashboard/add-salary', route: '/dashboard/add-salary', status: 'active' },
  { name: 'Salary List', category: 'Employee', path: '/dashboard/salary-list', route: '/dashboard/salary-list', status: 'active' },

  // Supplier
  { name: 'Supplier List', category: 'Supplier', path: '/dashboard/supplier-list', route: '/dashboard/supplier-list', status: 'active' },
  { name: 'Add Supplier', category: 'Supplier', path: '/dashboard/add-supplier', route: '/dashboard/add-supplier', status: 'active' },
  { name: 'Update Supplier', category: 'Supplier', path: '/dashboard/update-supplier', route: '/dashboard/update-supplier', status: 'active' },
  { name: 'Supplier Profile', category: 'Supplier', path: '/dashboard/supplier-profile', route: '/dashboard/supplier-profile', status: 'active' },
  { name: 'Recycle Bin Supplier', category: 'Supplier', path: '/dashboard/recycle-bin-supplier-list', route: '/dashboard/recycle-bin-supplier-list', status: 'active' },

  // Company
  { name: 'Company List', category: 'Company', path: '/dashboard/company-list', route: '/dashboard/company-list', status: 'active' },
  { name: 'Add Company', category: 'Company', path: '/dashboard/add-company', route: '/dashboard/add-company', status: 'active' },
  { name: 'Update Company', category: 'Company', path: '/dashboard/update-company', route: '/dashboard/update-company', status: 'active' },
  { name: 'Company Profile', category: 'Company', path: '/dashboard/company-profile', route: '/dashboard/company-profile', status: 'active' },
  { name: 'Recycle Bin Company', category: 'Company', path: '/dashboard/recycle-bin-company-list', route: '/dashboard/recycle-bin-company-list', status: 'active' },

  // Showroom
  { name: 'Showroom List', category: 'Showroom', path: '/dashboard/show-room-list', route: '/dashboard/show-room-list', status: 'active' },
  { name: 'Add Showroom', category: 'Showroom', path: '/dashboard/add-show-room', route: '/dashboard/add-show-room', status: 'active' },
  { name: 'Update Showroom', category: 'Showroom', path: '/dashboard/update-show-room', route: '/dashboard/update-show-room', status: 'active' },
  { name: 'Showroom Profile', category: 'Showroom', path: '/dashboard/show-room-profile', route: '/dashboard/show-room-profile', status: 'active' },
  { name: 'Recycle Bin Showroom', category: 'Showroom', path: '/dashboard/recycle-bin-showroom-list', route: '/dashboard/recycle-bin-showroom-list', status: 'active' },

  // Product & Inventory
  { name: 'Product List', category: 'Inventory', path: '/dashboard/product-list', route: '/dashboard/product-list', status: 'active' },
  { name: 'Add Product', category: 'Inventory', path: '/dashboard/add-product', route: '/dashboard/add-product', status: 'active' },
  { name: 'Update Product', category: 'Inventory', path: '/dashboard/update-product', route: '/dashboard/update-product', status: 'active' },
  { name: 'Category', category: 'Inventory', path: '/dashboard/category', route: '/dashboard/category', status: 'active' },
  { name: 'Brand', category: 'Inventory', path: '/dashboard/brand', route: '/dashboard/brand', status: 'active' },
  { name: 'Unit', category: 'Inventory', path: '/dashboard/unit', route: '/dashboard/unit', status: 'active' },
  { name: 'Product Type', category: 'Inventory', path: '/dashboard/product-type', route: '/dashboard/product-type', status: 'active' },
  { name: 'Barcode', category: 'Inventory', path: '/dashboard/barcode', route: '/dashboard/barcode', status: 'active' },
  { name: 'Inventory Dashboard', category: 'Inventory', path: '/dashboard/inventory-dashboard', route: '/dashboard/inventory-dashboard', status: 'active' },
  { name: 'Stock', category: 'Inventory', path: '/dashboard/stock', route: '/dashboard/stock', status: 'active' },
  { name: 'Stock Adjustment', category: 'Inventory', path: '/dashboard/adjustment', route: '/dashboard/adjustment', status: 'active' },
  { name: 'Add Adjustment', category: 'Inventory', path: '/dashboard/add-adjustment', route: '/dashboard/add-adjustment', status: 'active' },
  { name: 'Quantity Adjustment', category: 'Inventory', path: '/dashboard/quantity-adjustment', route: '/dashboard/quantity-adjustment', status: 'active' },
  { name: 'Expired Products', category: 'Inventory', path: '/dashboard/expired-products', route: '/dashboard/expired-products', status: 'active' },
  { name: 'Low Stocks', category: 'Inventory', path: '/dashboard/low-stocks', route: '/dashboard/low-stocks', status: 'active' },
  { name: 'Warehouse', category: 'Inventory', path: '/dashboard/warehouse', route: '/dashboard/warehouse', status: 'active' },
  { name: 'Variants', category: 'Inventory', path: '/dashboard/variants', route: '/dashboard/variants', status: 'active' },
  { name: 'Stock Transaction', category: 'Inventory', path: '/dashboard/stock-transaction', route: '/dashboard/stock-transaction', status: 'active' },
  { name: 'Warranties', category: 'Inventory', path: '/dashboard/warranties', route: '/dashboard/warranties', status: 'active' },
  { name: 'Stock Transfer', category: 'Inventory', path: '/dashboard/stock-transfer', route: '/dashboard/stock-transfer', status: 'active' },
  { name: 'Remove Stock', category: 'Inventory', path: '/dashboard/remove-stock', route: '/dashboard/remove-stock', status: 'active' },
  { name: 'Purchase Order', category: 'Inventory', path: '/dashboard/purchase-order', route: '/dashboard/purchase-order', status: 'active' },
  { name: 'Purchase Return', category: 'Inventory', path: '/dashboard/purchase-return-add', route: '/dashboard/purchase-return-add', status: 'active' },
  { name: 'Purchase Return List', category: 'Inventory', path: '/dashboard/purchase-return', route: '/dashboard/purchase-return', status: 'active' },
  { name: 'Update Purchase Return', category: 'Inventory', path: '/dashboard/update-purchase-return', route: '/dashboard/update-purchase-return', status: 'active' },
  { name: 'Warehouse Stock', category: 'Inventory', path: '/dashboard/warehouse-stock', route: '/dashboard/warehouse-stock', status: 'active' },

  // Purchase
  { name: 'Purchase List', category: 'Purchase', path: '/dashboard/purchase-list', route: '/dashboard/purchase-list', status: 'active' },
  { name: 'Add Purchase', category: 'Purchase', path: '/dashboard/add-purchase', route: '/dashboard/add-purchase', status: 'active' },
  { name: 'Update Purchase', category: 'Purchase', path: '/dashboard/update-purchase', route: '/dashboard/update-purchase', status: 'active' },

  // Expense
  { name: 'Expense List', category: 'Expense', path: '/dashboard/expense-list', route: '/dashboard/expense-list', status: 'active' },
  { name: 'Add Expense', category: 'Expense', path: '/dashboard/add-expense', route: '/dashboard/add-expense', status: 'active' },
  { name: 'Update Expense', category: 'Expense', path: '/dashboard/update-expense', route: '/dashboard/update-expense', status: 'active' },
  { name: 'View Expense', category: 'Expense', path: '/dashboard/view-expense', route: '/dashboard/view-expense', status: 'active' },
  { name: 'Expense Categories', category: 'Expense', path: '/dashboard/expense-categories', route: '/dashboard/expense-categories', status: 'active' },

  // Attendance
  { name: 'Add Attendance', category: 'Attendance', path: '/dashboard/add-attendance', route: '/dashboard/add-attendance', status: 'active' },
  { name: 'Attendance List', category: 'Attendance', path: '/dashboard/attendance-list', route: '/dashboard/attendance-list', status: 'active' },
  { name: 'Update Attendance', category: 'Attendance', path: '/dashboard/update-attendance', route: '/dashboard/update-attendance', status: 'active' },
  { name: 'View Attendance', category: 'Attendance', path: '/dashboard/view-attendance', route: '/dashboard/view-attendance', status: 'active' },

  // Projects
  { name: 'Running Project', category: 'Projects', path: '/dashboard/running-project', route: '/dashboard/running-project', status: 'active' },
  { name: 'Completed Project', category: 'Projects', path: '/dashboard/complete-project', route: '/dashboard/complete-project', status: 'active' },

  // Bill Pay
  { name: 'Bill Pay List', category: 'Bill Pay', path: '/dashboard/paybill', route: '/dashboard/paybill', status: 'active' },
  { name: 'Add Paybill', category: 'Bill Pay', path: '/dashboard/add-paybill', route: '/dashboard/add-paybill', status: 'active' },
  { name: 'Update Paybill', category: 'Bill Pay', path: '/dashboard/update-paybill', route: '/dashboard/update-paybill', status: 'active' },
  { name: 'Bill Pay View', category: 'Bill Pay', path: '/dashboard/paybill-view', route: '/dashboard/paybill-view', status: 'active' },
  { name: 'Bill Pay History', category: 'Bill Pay', path: '/dashboard/bill-pay-history', route: '/dashboard/bill-pay-history', status: 'active' },

  // Holiday
  { name: 'Holiday', category: 'Holiday', path: '/dashboard/holiday', route: '/dashboard/holiday', status: 'active' },
  { name: 'Create Holiday', category: 'Holiday', path: '/dashboard/create-holiday', route: '/dashboard/create-holiday', status: 'active' },
  { name: 'Update Holiday', category: 'Holiday', path: '/dashboard/update-holiday', route: '/dashboard/update-holiday', status: 'active' },

  // Income
  { name: 'Add Income', category: 'Income', path: '/dashboard/add-income', route: '/dashboard/add-income', status: 'active' },
  { name: 'Income List', category: 'Income', path: '/dashboard/income-list', route: '/dashboard/income-list', status: 'active' },
  { name: 'Update Income', category: 'Income', path: '/dashboard/update-income', route: '/dashboard/update-income', status: 'active' },

  // Donation
  { name: 'Create Donation', category: 'Donation', path: '/dashboard/create-donation', route: '/dashboard/create-donation', status: 'active' },
  { name: 'Donation List', category: 'Donation', path: '/dashboard/donation-list', route: '/dashboard/donation-list', status: 'active' },
  { name: 'Update Donation', category: 'Donation', path: '/dashboard/update-donation', route: '/dashboard/update-donation', status: 'active' },

  // Reports
  { name: 'Reports', category: 'Reports', path: '/dashboard/report', route: '/dashboard/report', status: 'active' },
  { name: 'Expired Product Report', category: 'Reports', path: '/dashboard/expired-product-report', route: '/dashboard/expired-product-report', status: 'active' },
  { name: 'Low Stock Report', category: 'Reports', path: '/dashboard/low-stock-report', route: '/dashboard/low-stock-report', status: 'active' },
  { name: 'Product Stock Report', category: 'Reports', path: '/dashboard/product-stock-report', route: '/dashboard/product-stock-report', status: 'active' },
  { name: 'Daily Stock Movement Report', category: 'Reports', path: '/dashboard/daily-stock-movement', route: '/dashboard/daily-stock-movement', status: 'active' },
  { name: 'Income Report', category: 'Reports', path: '/dashboard/income-report', route: '/dashboard/income-report', status: 'active' },
  { name: 'Expense Report', category: 'Reports', path: '/dashboard/expense-report', route: '/dashboard/expense-report', status: 'active' },
  { name: 'Invoice Report', category: 'Reports', path: '/dashboard/invoice-report', route: '/dashboard/invoice-report', status: 'active' },
  { name: 'Donation Report', category: 'Reports', path: '/dashboard/donation-report', route: '/dashboard/donation-report', status: 'active' },

  // Super Admin / Tenant Management
  { name: 'All Tenant List', category: 'Super Admin', path: '/dashboard/all-tenant-list', route: '/dashboard/all-tenant-list', status: 'active' },
  { name: 'All User List', category: 'Super Admin', path: '/dashboard/all-user-list', route: '/dashboard/all-user-list', status: 'active' },
  { name: 'Company Brand', category: 'Super Admin', path: '/dashboard/company-brand', route: '/dashboard/company-brand', status: 'active' },
  { name: 'Review', category: 'Super Admin', path: '/dashboard/review', route: '/dashboard/review', status: 'active' },

  // Backup & Restore
  { name: 'Backup', category: 'System', path: '/dashboard/backup', route: '/dashboard/backup', status: 'active' },
  { name: 'Restore', category: 'System', path: '/dashboard/restore', route: '/dashboard/restore', status: 'active' },

  // Vehicles
  { name: 'Vehicles', category: 'Vehicles', path: '/dashboard/vehicles', route: '/dashboard/vehicles', status: 'active' },

  // Calendar
  { name: 'Calendar', category: 'System', path: '/dashboard/calender', route: '/dashboard/calender', status: 'active' },
];

// default role 
export const DEFAULT_ROLES: IDefaultRole[] = [
  {
    name: 'admin',
    type: 'admin',
    description: 'Full system access',
  },
  {
    name: 'manager',
    type: 'manager',
    description: 'Can manage day-to-day operations but not system settings',
  },
  {
    name: 'employee',
    type: 'employee',
    description: 'Can perform assigned tasks',
  },
];