/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { SearchableFields } from './expense.const';
import { IExpense } from './expense.interface';
import { getTenantModel } from '../../utils/getTenantModels';
import mongoose from 'mongoose';

export const createExpense = async (tenantDomain: string, payload: any) => {
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');

  try {
    if (payload.invoice_id) {
      const exists = await Expense.findOne({ invoice_id: payload.invoice_id });
      if (exists) {
        throw new Error('This invoice id already create  to another expense');
      }
    }
    if (!payload.invoice_id) {
      delete payload.invoice_id;
    } else if (!mongoose.Types.ObjectId.isValid(payload.invoice_id)) {
      throw new Error('Invalid invoice_id');
    }

    const expenseItems = payload.expense_items ?? [];
    const totalOtherExpense = expenseItems.reduce(
      (sum: number, item: any) => sum + (Number(item.amount) || 0),
      0,
    );

    const invoiceCost = Number(payload.invoiceCost) || 0;
    const totalAmount = totalOtherExpense + invoiceCost;

    const newExpense = await Expense.create({
      totalOtherExpense,
      totalAmount,
      ...payload,
    });

    return newExpense;
  } catch (error: any) {
    throw new Error(
      error.message ||
        'An unexpected error occurred while creating the expense',
    );
  }
};
const updateExpense = async (
  tenantDomain: string,
  id: string,
  payload: any,
) => {
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');

  try {
    if (!payload.invoice_id || payload.invoice_id === '') {
      delete payload.invoice_id;
    } else if (!mongoose.Types.ObjectId.isValid(payload.invoice_id)) {
      throw new Error('Invalid invoice_id');
    }

    let totalAmount: number | undefined;

    if (
      Array.isArray(payload.expense_items) ||
      payload.invoiceCost !== undefined
    ) {
      const items = payload.expense_items ?? [];
      const someExpense = items.reduce(
        (sum: number, item: any) => sum + (Number(item.amount) || 0),
        0,
      );

      totalAmount = someExpense + (Number(payload.invoiceCost) || 0);
    }

    const updatedPayload = {
      ...payload,
      ...(totalAmount !== undefined && { totalAmount }),
    };

    const result = await Expense.findByIdAndUpdate(
      id,
      { $set: updatedPayload },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!result) {
      throw new Error('Expense not found');
    }

    return result;
  } catch (error: any) {
    throw new Error(
      error.message ||
        'An unexpected error occurred while updating the expense',
    );
  }
};

const getAllExpense = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');

  const categoryQuery = new QueryBuilder(Expense.find(), query).search(
    SearchableFields,
  );

  const meta = await categoryQuery.countTotal();
  const expenses = await categoryQuery.modelQuery.populate({
    path: 'invoice_id',
    select: 'Id invoice_no',
  });

  return {
    meta,
    expenses,
  };
};

const getSingleExpense = async (tenantDomain: string, id: string) => {
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');

  const result = await Expense.findById(id).populate({
    path: 'invoice_id',
    select: 'Id invoice_no',
  });

  return result;
};

const deleteExpense = async (tenantDomain: string, id: string) => {
  const { Model: Expense } = await getTenantModel(tenantDomain, 'Expense');

  const result = await Expense.deleteOne({ _id: id });
  return result;
};

export const expenseServices = {
  createExpense,
  getAllExpense,
  getSingleExpense,
  updateExpense,
  deleteExpense,
};
