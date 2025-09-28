import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { IPage, IPageDocument, IPageFilters } from './page.interface';
import Page from './page.model';
import AppError from '../../errors/AppError';

/**
 * Create a new page
 */
const createPage = async (payload: IPage): Promise<IPageDocument> => {
  // Check if the page path already exists
  const pageExists = await Page.isPageExistsByPath(payload.path);
  if (pageExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Page path already exists!');
  }

  // Create the page using Mongoose
  const newPage = new Page(payload);
  const result = await newPage.save();
  return result;
};

/**
 * Get all pages with filtering and pagination
 */
const getAllPages = async () => {

};

/**
 * Get all pages without pagination (for dropdown lists, etc.)
 */
const getAllPagesForOptions = async (): Promise<IPageDocument[]> => {
  const result = await Page.find({ status: 'active' })
    .sort({ category: 1, name: 1 })
    .exec();
  return result;
};

/**
 * Get page by ID
 */
const getPageById = async (id: string): Promise<IPageDocument> => {
  const result = await Page.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  }
  return result;
};

/**
 * Update page
 */
const updatePage = async (id: string, payload: Partial<IPage>): Promise<IPageDocument> => {
  // Check if the page exists
  const page = await Page.findById(id);
  if (!page) {
    throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  }
  
  // Check if the path already exists (if path is being updated)
  if (payload.path && payload.path !== page.path) {
    const pageExists = await Page.isPageExistsByPath(payload.path);
    if (pageExists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Page path already exists!');
    }
  }
  
  // Update the page using Mongoose
  const result = await Page.findByIdAndUpdate(
    id, 
    { $set: payload },
    { new: true, runValidators: true }
  );
  
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  }
  
  return result;
};

/**
 * Delete page
 */
const deletePage = async (id: string): Promise<IPageDocument> => {
  // Check if the page exists
  const page = await Page.findById(id);
  if (!page) {
    throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  }
  
  // Check if the page is used in any role permissions using Mongoose
  const Role = require('../role/role.model').default;
  const rolesUsingPage = await Role.countDocuments({
    'permissions.pageId': new Types.ObjectId(id)
  });
  
  if (rolesUsingPage > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      `Cannot delete page. It is used in ${rolesUsingPage} roles.`
    );
  }
  
  // Delete the page using Mongoose
  const result = await Page.findByIdAndDelete(id);
  
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  }
  
  return result;
};

/**
 * Get pages by category
 */
const getPagesByCategory = async (category: string): Promise<IPageDocument[]> => {
  const result = await Page.find({ category, status: 'active' })
    .sort({ name: 1 })
    .exec();
  return result;
};

export const PageService = {
  createPage,
  getAllPages,
  getAllPagesForOptions,
  getPageById,
  updatePage,
  deletePage,
  getPagesByCategory,
};