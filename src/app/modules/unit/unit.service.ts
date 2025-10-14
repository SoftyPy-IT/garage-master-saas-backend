/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { Unit } from './unit.model';
import { unitSearch } from './unit.constant';
import { TUnit } from './unit.interface';
import { getTenantModel } from '../../utils/getTenantModels';
const createUnit = async (tenantDomain: string, payload: any) => {
  try {
    const { Model: UnitModel } = await getTenantModel(tenantDomain, 'Unit');
    const newUnit = await UnitModel.create(payload);
    return newUnit;
  } catch (error: any) {
    console.error('Error creating unit:', error.message);
    throw new Error(
      error.message || 'An unexpected error occurred while creating the unit',
    );
  }
};



const getAllUnit = async (tenantDomain: string, query: Record<string, unknown>) => {
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');

  const categoryQuery = new QueryBuilder(Unit.find(), query)
    .search(unitSearch)
    // .filter()
    // .sort()
    .paginate()
    .fields();

  const meta = await categoryQuery.countTotal();
  const units = await categoryQuery.modelQuery;

  return {
    meta,
    units,
  };
};
const getSinigleUnit = async (tenantDomain: string, id: string) => {
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');
  const result = await Unit.findById(id);
  return result;
};

const updateUnit = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TUnit>
) => {
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');
  const result = await Unit.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteUnit = async (tenantDomain: string, id: string) => {
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');
  const result = await Unit.deleteOne({ _id: id });
  return result;
};

export const unitServices = {
  createUnit,
  getAllUnit,
  getSinigleUnit,
  updateUnit,
  deleteUnit,
};
