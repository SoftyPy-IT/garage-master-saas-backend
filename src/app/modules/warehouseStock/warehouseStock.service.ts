/* eslint-disable @typescript-eslint/no-explicit-any */

import QueryBuilder from '../../builder/QueryBuilder';
import { getTenantModel } from '../../utils/getTenantModels';
import { IWarehouseStock } from './warehouseStock.interface';

const createWarehouseStock = async (tenantDomain: string, payload: IWarehouseStock) => {
    const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');

    try {

        const existing = await WarehouseStock.findOne({
            warehouse: payload.warehouse,
            product: payload.product,
        });

        if (existing) {
            existing.quantity += payload.quantity;
            await existing.save();
            return existing;
        }

        const newRecord = await WarehouseStock.create(payload);
        return newRecord;
    } catch (error: any) {
        console.error('Error creating WarehouseStock:', error.message);
        throw new Error(error.message || 'Failed to create WarehouseStock');
    }
};

const getAllWarehouseStocks = async (
    tenantDomain: string,
    query: Record<string, unknown>,
) => {
    const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');

    const warehouseStockQuery = new QueryBuilder(WarehouseStock.find().populate(['warehouse', 'product']), query)
        .paginate()
        .fields();

    const meta = await warehouseStockQuery.countTotal();
    const warehouseStocks = await warehouseStockQuery.modelQuery;

    return {
        meta,
        warehouseStocks,
    };
};

const getSingleWarehouseStock = async (tenantDomain: string, id: string) => {
    const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
    const result = await WarehouseStock.findById(id).populate(['warehouse', 'product']);
    return result;
};

const updateWarehouseStock = async (
    tenantDomain: string,
    id: string,
    payload: Partial<IWarehouseStock>,
): Promise<IWarehouseStock | null> => {
    const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');

    const updated = await WarehouseStock.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });

    if (!updated) {
        throw new Error('WarehouseStock not found');
    }

    return updated.toObject();
};

const deleteWarehouseStock = async (tenantDomain: string, id: string) => {
    const { Model: WarehouseStock } = await getTenantModel(tenantDomain, 'WarehouseStock');
    const result = await WarehouseStock.deleteOne({ _id: id });
    return result;
};

export const warehouseStockServices = {
    createWarehouseStock,
    getAllWarehouseStocks,
    getSingleWarehouseStock,
    updateWarehouseStock,
    deleteWarehouseStock,
};
