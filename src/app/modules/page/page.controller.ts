// src/modules/page/page.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { PageService } from './page.service';
import { IPage } from './page.interface';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';

const createPage = catchAsync(async (req: Request, res: Response) => {
   const tenantDomain = req.query.tenantDomain as string;
  const result = await PageService.createPage(tenantDomain, req.body as IPage);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Page created successfully!',
    data: result,
  });
});

const getAllPages = catchAsync(async (req: Request, res: Response) => {
   const tenantDomain = req.query.tenantDomain as string;
  const filters = pick(req.query, ['searchTerm', 'category', 'status']);
  const result = await PageService.getAllPages(tenantDomain, filters);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pages retrieved successfully!',
    data: result,
  });
});


const getPageById = catchAsync(async (req: Request, res: Response) => {
   const tenantDomain = req.query.tenantDomain as string;
  const result = await PageService.getPageById(tenantDomain, req.params.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Page retrieved successfully!',
    data: result,
  });
});

const updatePage = catchAsync(async (req: Request, res: Response) => {
   const tenantDomain = req.query.tenantDomain as string;
  const result = await PageService.updatePage(tenantDomain, req.params.id, req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Page updated successfully!',
    data: result,
  });
});

const deletePage = catchAsync(async (req: Request, res: Response) => {
   const tenantDomain = req.query.tenantDomain as string;
  const result = await PageService.deletePage(tenantDomain, req.params.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Page deleted successfully!',
    data: result,
  });
});



export const PageController = {
  createPage,
  getAllPages,
  getPageById,
  updatePage,
  deletePage,
};