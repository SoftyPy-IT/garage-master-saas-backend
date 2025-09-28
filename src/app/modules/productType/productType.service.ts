/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { productTypeSearch } from './productType.constant';
import { TProductType } from './productType.interface';
import { getTenantModel } from '../../utils/getTenantModels';

export const createProductType = async (
  tenantDomain: string,
  payload: TProductType,
) => {
  console.log('from product type', tenantDomain);
  const { Model: ProductType } = await getTenantModel(
    tenantDomain,
    'ProductType',
  );
  const result = await ProductType.create(payload);

  return result;
};

// 2. Get All Product Types
export const getAllProductType = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: ProductType } = await getTenantModel(
    tenantDomain,
    'ProductType',
  );

  const categoryQuery = new QueryBuilder(ProductType.find(), query)
    .search(productTypeSearch)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await categoryQuery.countTotal();
  const productTypes = await categoryQuery.modelQuery;
  return {
    meta,
    productTypes,
  };
};

// 3. Get Single Product Type
export const getSinigleProductType = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: ProductType } = await getTenantModel(
    tenantDomain,
    'ProductType',
  );
  const result = await ProductType.findById(id);
  return result;
};

// 4. Update Product Type
export const updateProductType = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TProductType>,
) => {
  const { Model: ProductType } = await getTenantModel(
    tenantDomain,
    'ProductType',
  );
  const result = await ProductType.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

// 5. Delete Product Type
export const deleteProductType = async (tenantDomain: string, id: string) => {
  const { Model: ProductType } = await getTenantModel(
    tenantDomain,
    'ProductType',
  );
  const result = await ProductType.deleteOne({ _id: id });
  return result;
};

export const productTypeServices = {
  createProductType,
  getAllProductType,
  getSinigleProductType,
  updateProductType,
  deleteProductType,
};
