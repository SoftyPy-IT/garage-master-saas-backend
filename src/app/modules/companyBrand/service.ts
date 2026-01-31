import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import { CompanyBrand } from './model';
import { ICompanyBrand } from './interface';
import AppError from '../../errors/AppError';

const createCompanyBrand = async (payload: ICompanyBrand) => {
  const result = await CompanyBrand.create(payload);
  return result;
};

const getAllCompanyBrands = async (query: Record<string, unknown>) => {
  const queryBuilder = new QueryBuilder(CompanyBrand.find(), query)
    .search(['brand'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await queryBuilder.countTotal();
  const data = await queryBuilder.modelQuery;

  return { meta, data };
};




const deleteCompanyBrand = async (id: string) => {
  const result = await CompanyBrand.findByIdAndDelete(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'CompanyBrand not found or already deleted');
  }
  return result;
};

export const companyBrandServices = {
  createCompanyBrand,
  getAllCompanyBrands,
  deleteCompanyBrand,
};
