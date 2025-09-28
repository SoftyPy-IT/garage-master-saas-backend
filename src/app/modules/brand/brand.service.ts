/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { TBrand } from './brand.interface';
import { brandSearch } from './brand.constant';
import { getTenantModel } from '../../utils/getTenantModels';
const createBrand = async (tenantDomain: string, payload:any) => {
  try {
    
 const { Model: BrandModel } = await getTenantModel(tenantDomain, 'Brand');
     const newBrand = await BrandModel.create(payload);
     return newBrand;
  } catch (error: any) {
    console.error('Error creating brand:', error.message);
    throw new Error(
      error.message || 'An unexpected error occurred while creating the brand',
    );
  }
};


export const getAllBrand = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: Brand } = await getTenantModel(
    tenantDomain,
    'Brand',
  );

  const brandQuery = new QueryBuilder(Brand.find(), query)
    .search(brandSearch)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await brandQuery.countTotal();
  const brands = await brandQuery.modelQuery;

  return {
    meta,
    brands,
  };
};

export const getSinigleBrand = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Brand } = await getTenantModel(
    tenantDomain,
    'Brand',
  );

  const result = await Brand.findById(id);
  return result;
};

export const updateBrand = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TBrand>,
) => {
  const { Model: Brand } = await getTenantModel(
    tenantDomain,
    'Brand',
  );

  const result = await Brand.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

export const deleteBrand = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Brand } = await getTenantModel(
    tenantDomain,
    'Brand',
  );

  const result = await Brand.deleteOne({ _id: id });

  return result;
};

export const brandServices = {
  createBrand,
  getAllBrand,
  getSinigleBrand,
  updateBrand,
  deleteBrand,
};
