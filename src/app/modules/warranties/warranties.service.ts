/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';
import { TWarranty } from './warranties.interface';
import QueryBuilder from '../../builder/QueryBuilder';

const createWarranty = async (payload: TWarranty, tenantDomain: string) => {
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty')

  const newWarranty = await Warranty.create(payload);
  return newWarranty;
};

export const getAllWarranty = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const qb = new QueryBuilder(
    Warranty.find().populate({
      path: 'products',
      model: Product,
      select: 'product_name',
    }),
    query,
  )
    .search(['name', 'description'])
    // .filter()
    // .sort()
    .paginate()
    .fields();

  const warranties = await qb.modelQuery;
  const total = await qb.countTotal();

  // Map to include totalProducts count and only product names
  const formatted = warranties.map((warranty: any) => ({
    ...warranty.toObject(),
    totalProducts: warranty.products.length,
    products: warranty.products.map((p: any) => p.product_name),
  }));

  return {
    data: formatted,
    ...total,
  };
};

const getSingleWarranty = async (tenantDomain: string, id: string) => {
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');
  const warranty = await Warranty.findById(id);

  if (!warranty) {
    throw new AppError(httpStatus.NOT_FOUND, 'Warranty not found!');
  }

  return warranty;
};

const deleteWarranty = async (tenantDomain: string, id: string) => {
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');
  const result = await Warranty.findByIdAndDelete(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Warranty not found!');
  }

  return result;
};

const updateWarranty = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TWarranty>,
) => {
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');

  const existingWarranty = await Warranty.findById(id);
  if (!existingWarranty) {
    throw new AppError(httpStatus.NOT_FOUND, 'Warranty not found!');
  }

  const updatedWarranty = await Warranty.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updatedWarranty;
};

export const WarrantyServices = {
  createWarranty,
  getAllWarranty,
  getSingleWarranty,
  deleteWarranty,
  updateWarranty,
};
