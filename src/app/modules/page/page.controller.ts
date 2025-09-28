import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { PageService } from './page.service';
import { IPage, IPageDocument } from './page.interface';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';

/**
 * Create a new page
 */
const createPage = catchAsync(async (req: Request, res: Response) => {
  const result = await PageService.createPage(req.body as IPage);
  
  sendResponse<IPageDocument>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Page created successfully!',
    data: result,
  });
});

/**
 * Get all pages with filtering and pagination
 */
const getAllPages = catchAsync(async (req: Request, res: Response) => {
  
});

/**
 * Get all pages for dropdown options
 */
const getAllPagesForOptions = catchAsync(async (req: Request, res: Response) => {
  const result = await PageService.getAllPagesForOptions();
  
  sendResponse<IPageDocument[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pages retrieved successfully!',
    data: result,
  });
});

/**
 * Get page by ID
 */
const getPageById = catchAsync(async (req: Request, res: Response) => {
  const result = await PageService.getPageById(req.params.id);
  
  sendResponse<IPageDocument>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Page retrieved successfully!',
    data: result,
  });
});

/**
 * Update page
 */
const updatePage = catchAsync(async (req: Request, res: Response) => {
  const result = await PageService.updatePage(req.params.id, req.body);
  
  sendResponse<IPageDocument>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Page updated successfully!',
    data: result,
  });
});

/**
 * Delete page
 */
const deletePage = catchAsync(async (req: Request, res: Response) => {
  const result = await PageService.deletePage(req.params.id);
  
  sendResponse<IPageDocument>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Page deleted successfully!',
    data: result,
  });
});

/**
 * Get pages by category
 */
const getPagesByCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await PageService.getPagesByCategory(req.params.category);
  
  sendResponse<IPageDocument[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Pages retrieved successfully!',
    data: result,
  });
});

export const PageController = {
  createPage,
  getAllPages,
  getAllPagesForOptions,
  getPageById,
  updatePage,
  deletePage,
  getPagesByCategory,
};