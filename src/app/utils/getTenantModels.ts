import mongoose from 'mongoose';
import httpStatus from 'http-status';
import { Tenant } from '../modules/tenant/tenant.model';
import AppError from '../errors/AppError';
import { connectToTenantDatabase } from '../../server';
import { unitSchema } from '../modules/unit/unit.model';
import { userSchema } from '../modules/user/user.model';
import { brandSchema } from '../modules/brand/brand.model';
import { customerSchema } from '../modules/customer/customer.model';
import { vehicleSchema } from '../modules/vehicle/vehicle.model';
import { addToJobCardSchema } from '../modules/jobCard/job-card.model';
import { quotationSchema } from '../modules/quotation/quotation.model';
import { moneyReceiptSchema } from '../modules/money-receipt/money-receipt.model';
import { invoiceSchema } from '../modules/invoice/invoice.model';
import { companySchema } from '../modules/company/company.model';
import { showRoomSchema } from '../modules/showRoom/showRoom.model';
import { stockSchema } from '../modules/stocks/stocks.model';
import { StockTransactionSchema } from '../modules/stockTransaction/stockTransaction.model';
import { ProductSchema } from '../modules/product/product.model';
import { LeaveRequestSchema } from '../modules/leave/leave.model';
import { supplierSchema } from '../modules/supplier/supplier.model';
import { productTypeSchema } from '../modules/productType/productType.model';
import { categorySchema } from '../modules/category/category.model';
import { warehouseSchema } from '../modules/warehouse/warehouse.model';
import { purchaseOrderSchema } from '../modules/purchaseorder/purchaseorder.model';
import { purchaseSchema } from '../modules/purchase/purchase.model';
import { purchaseReturnSchema } from '../modules/purchasereturn/purchasereturn.model';
import { stockTransferSchema } from '../modules/stockTransfer/stockTransfer.model';
import { employeeSchema } from '../modules/employee/employee.model';
import { attendanceSchema } from '../modules/attendance/attendance.model';
import { salarySchema } from '../modules/salary/salary.model';
import { employeeOvertimeSchema } from '../modules/overtime/overtime.model';
import { incomeSchema } from '../modules/income/income.model';
import {
  expenseCategorySchema,
  expenseSchema,
} from '../modules/expense/expense.model';
import { companyProfileSchema } from '../modules/companyProfile/companyProfile.model';
import { DonationSchema } from '../modules/donation/donatin.model';
import { BillPaySchema } from '../modules/bill-pay/bill-pay.model';
import { noteSchema } from '../modules/note/note.model';
import { warrantySchema } from '../modules/warranties/warranties.model';
import { pageSchema } from '../modules/page/page.model';
import { roleSchema } from '../modules/role/role.model';
import { permissionSchema } from '../modules/permission/permission.model';
import { barcodeSchema } from '../modules/barcode/barcode.model';
import { adjustmentSchema } from '../modules/adjustment/adjustment.model';
import { warehouseStockSchema } from '../modules/warehouseStock/warehouseStock.model';

type SchemaMap = {
  [key: string]: mongoose.Schema;
};

const schemas: SchemaMap = {
  User: userSchema,
  Barcode: barcodeSchema,
  Attendance: attendanceSchema,
  Salary: salarySchema,
  Employee: employeeSchema,
  Unit: unitSchema,
  PurchaseReturn: purchaseReturnSchema,
  Brand: brandSchema,
  Customer: customerSchema,
  ShowRoom: showRoomSchema,
  Company: companySchema,
  Vehicle: vehicleSchema,
  JobCard: addToJobCardSchema,
  Quotation: quotationSchema,
  Stocks: stockSchema,
  Invoice: invoiceSchema,
  Product: ProductSchema,
  StockTransaction: StockTransactionSchema,
  MoneyReceipt: moneyReceiptSchema,
  LeaveRequest: LeaveRequestSchema,
  Supplier: supplierSchema,
  ProductType: productTypeSchema,
  Category: categorySchema,
  Warehouse: warehouseSchema,
  PurchaseOrder: purchaseOrderSchema,
  Purchase: purchaseSchema,
  Stock: stockSchema,
  StockTransfer: stockTransferSchema,
  EmployeeOvertime: employeeOvertimeSchema,
  Income: incomeSchema,
  ExpenseCategory: expenseCategorySchema,
  Expense: expenseSchema,
  CompanyProfile: companyProfileSchema,
  Donation: DonationSchema,
  BillPay: BillPaySchema,
  Note: noteSchema,
  Warranty: warrantySchema,
  Role: roleSchema,
  Page: pageSchema,
  Permission: permissionSchema,
  WarehouseStock: warehouseStockSchema,
  Adjustment: adjustmentSchema,
};

export const getTenantModel = async (
  tenantIdentifier: string,
  modelName: keyof typeof schemas,
) => {
  let tenant;
  if (mongoose.Types.ObjectId.isValid(tenantIdentifier)) {
    // Search by _id
    tenant = await Tenant.findById(tenantIdentifier);
  } else {
    // Search by domain
    tenant = await Tenant.findOne({
      domain: { $regex: new RegExp(`^${tenantIdentifier}$`, 'i') },
    });
  }

  if (!tenant || !tenant.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found or inactive');
  }

  const tenantConnection = await connectToTenantDatabase(
    tenant._id.toString(),
    tenant.dbUri,
  );

  const schema = schemas[modelName];
  if (!schema) {
    throw new Error(`Schema not found for model: ${modelName}`);
  }

  const modelNameStr = String(modelName);
  const Model =
    tenantConnection.models[modelNameStr] ||
    tenantConnection.model(modelNameStr, schema);

  return { Model, tenant, connection: tenantConnection };
};
