/* eslint-disable @typescript-eslint/no-explicit-any */

import { getTenantModel } from '../../utils/getTenantModels';
import { IWarehouseStock } from './warehouseStock.interface';

const createWarehouseStock = async (
  tenantDomain: string,
  payload: IWarehouseStock,
) => {
  const { Model: WarehouseStock } = await getTenantModel(
    tenantDomain,
    'WarehouseStock',
  );

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
  const { Model: WarehouseStock } = await getTenantModel(
    tenantDomain,
    'WarehouseStock',
  );

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [warehouseStocks, totalResult] = await Promise.all([
    WarehouseStock.aggregate([
      // lookups + group
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      { $unwind: '$warehouse' },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$warehouse._id',
          warehouse: { $first: '$warehouse' },
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          products: {
            $push: {
              _id: '$product._id',
              product_name: '$product.product_name',
              product_code: '$product.product_code',
              quantity: '$quantity',
            },
          },
        },
      },
      { $sort: { 'warehouse.createdAt': -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),

    WarehouseStock.aggregate([
      {
        $group: {
          _id: '$warehouse',
        },
      },
      { $count: 'total' },
    ]),
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    warehouseStocks,
  };
};

const getSingleWarehouseStock = async (tenantDomain: string, id: string) => {
  const { Model: WarehouseStock } = await getTenantModel(
    tenantDomain,
    'WarehouseStock',
  );
  const result = await WarehouseStock.findById(id).populate([
    'warehouse',
    'product',
  ]);
  return result;
};

const updateWarehouseStock = async (
  tenantDomain: string,
  id: string,
  payload: Partial<IWarehouseStock>,
): Promise<IWarehouseStock | null> => {
  const { Model: WarehouseStock } = await getTenantModel(
    tenantDomain,
    'WarehouseStock',
  );

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
  const { Model: WarehouseStock } = await getTenantModel(
    tenantDomain,
    'WarehouseStock',
  );
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
