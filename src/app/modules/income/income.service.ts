/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { IIncome } from './income.interface';
import { getTenantModel } from '../../utils/getTenantModels';

const createIncome = async (tenantDomain: string, payload: any) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  try {
    // validate income id
    if (payload.invoice_id) {
      const exists = await Income.findOne({ invoice_id: payload.invoice_id });
      if (exists) {
        throw new Error('This invoice id already create  to another expense');
      }
    }

    // Filter only valid income items
    const validIncomeItems = Array.isArray(payload?.income_items)
      ? payload.income_items.filter(
          (item: any) => item?.name?.trim() && Number(item.amount) > 0,
        )
      : [];

    // Calculate totalOtherIncome from income_items
    const totalOtherIncome = validIncomeItems.reduce(
      (sum: number, item: any) => sum + Number(item.amount),
      0,
    );
 

    // Calculate totalAmount
    const totalAmount = totalOtherIncome ;

    // Create new income record
    const newIncome = await Income.create({
      ...payload,
      income_items: validIncomeItems.length > 0 ? validIncomeItems : undefined,
      totalOtherIncome,
      totalAmount,
    });

    return newIncome;
  } catch (error: any) {
    throw new Error(
      error.message || 'An unexpected error occurred while creating the income',
    );
  }
};

const getAllIncome = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  const incomeQuery = new QueryBuilder(Income.find(), query).search(['name']);

  const meta = await incomeQuery.countTotal();
  const incomes = await incomeQuery.modelQuery
  return {
    meta,
    incomes,
  };
};

const getSingleIncome = async (tenantDomain: string, id: string) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  const result = await Income.findById(id)

  return result;
};

const updateIncome = async (
  tenantDomain: string,
  id: string,
  payload: Partial<IIncome>,
) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  try {
    // Safely extract and validate income items
    const validIncomeItems = Array.isArray(payload?.income_items)
      ? payload.income_items.filter(
          (item: any) => item?.name?.trim() && Number(item.amount) > 0,
        )
      : [];

    // Calculate totals
    const totalOtherIncome = validIncomeItems.reduce(
      (sum: number, item: any) => sum + Number(item.amount),
      0,
    );

    const totalAmount = totalOtherIncome;

    // Build updated payload
    const updatedPayload = {
      ...payload,
      income_items: validIncomeItems.length > 0 ? validIncomeItems : undefined,
      totalOtherIncome,
      totalAmount,
    };

    // Update the document
    const result = await Income.findByIdAndUpdate(
      id,
      {
        $set: updatedPayload,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!result) {
      throw new Error('Income not found');
    }

    return result;
  } catch (error: any) {
    throw new Error(
      error.message || 'An unexpected error occurred while updating the income',
    );
  }
};

const deleteIncome = async (tenantDomain: string, id: string) => {
  const { Model: Income } = await getTenantModel(tenantDomain, 'Income');

  const result = await Income.deleteOne({ _id: id });
  return result;
};

export const incomeServices = {
  createIncome,
  getAllIncome,
  getSingleIncome,
  updateIncome,
  deleteIncome,
};
