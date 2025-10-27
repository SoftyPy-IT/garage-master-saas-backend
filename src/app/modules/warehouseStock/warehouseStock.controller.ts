import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { warehouseStockServices } from './warehouseStock.service';
import catchAsync from '../../utils/catchAsync';

const createWarehouseStock = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const { tenantDomain } = req.body;
    const result = await warehouseStockServices.createWarehouseStock(tenantDomain, payload);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Warehouse stock created successfully',
        data: result,
    });
});

const getAllWarehouseStocks = catchAsync(async (req: Request, res: Response) => {
    const tenantDomain = req.query.tenantDomain as string;
    const result = await warehouseStockServices.getAllWarehouseStocks(tenantDomain, req.query);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Warehouse stocks retrieved successfully',
        data: result,
    });
});

const getSingleWarehouseStock = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await warehouseStockServices.getSingleWarehouseStock(tenantDomain, id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Warehouse stock retrieved successfully',
        data: result,
    });
});

const updateWarehouseStock = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tenantDomain } = req.body;
    const result = await warehouseStockServices.updateWarehouseStock(tenantDomain, id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Warehouse stock updated successfully',
        data: result,
    });
});

const deleteWarehouseStock = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantDomain = req.query.tenantDomain as string;
    const result = await warehouseStockServices.deleteWarehouseStock(tenantDomain, id);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Warehouse stock deleted successfully',
        data: result,
    });
});

export const warehouseStockControllers = {
    createWarehouseStock,
    getAllWarehouseStocks,
    getSingleWarehouseStock,
    updateWarehouseStock,
    deleteWarehouseStock,
};
