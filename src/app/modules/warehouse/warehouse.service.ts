/* eslint-disable @typescript-eslint/no-explicit-any */

import QueryBuilder from '../../builder/QueryBuilder';
import { getTenantModel } from '../../utils/getTenantModels';
import { warehouseSearchFields } from './warehouse.constant';
import { IWarehouse } from './warehouse.interface';
import { generateWarehouseId } from "./warehouse.utils"; 

const createWarehouse = async (tenantDomain: string, payload: IWarehouse) => {
  const { Model: Warehouse } = await getTenantModel(tenantDomain, "Warehouse");

  try {
    const warehouseId = await generateWarehouseId(Warehouse);
    const { warehouseId: _, ...payloadWithoutWarehouseId } = payload;
    const newWarehouse = await Warehouse.create({
      warehouseId,
      ...payloadWithoutWarehouseId,
    });

    return newWarehouse;
  } catch (error: any) {
    console.error("Error creating warehouse:", error.message);
    throw new Error(
      error.message ||
        "An unexpected error occurred while creating the warehouse"
    );
  }
};


const getAllWarehouses = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  const warehouseQuery = new QueryBuilder(Warehouse.find(), query)
    .search(warehouseSearchFields)
    // .filter()
    // .sort()
    .paginate()
    .fields();

  const meta = await warehouseQuery.countTotal();
  const warehouses = await warehouseQuery.modelQuery;

  return {
    meta,
    warehouses,
  };
};

const getSingleWarehouse = async (tenantDomain: string, id: string) => {
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');
  const result = await Warehouse.findById(id);
  return result;
};

const updateWarehouse = async (
  tenantDomain: string,
  id: string,
  payload: Partial<IWarehouse>,
): Promise<IWarehouse | null> => {
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  const updatedWarehouse = await Warehouse.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updatedWarehouse) {
    throw new Error('Warehouse not found');
  }

  return updatedWarehouse.toObject();
};

const deleteWarehouse = async (tenantDomain: string, id: string) => {
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');
  const result = await Warehouse.deleteOne({ _id: id });
  return result;
};
export const warehouseServices = {
  createWarehouse,
  getAllWarehouses,
  getSingleWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
