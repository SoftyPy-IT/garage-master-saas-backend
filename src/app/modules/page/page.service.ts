// src/modules/page/page.service.ts
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import { IPage, IPageFilters } from './page.interface';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';

const createPage = async (tenantDomain: string, payload: IPage) => {
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  // Check if the page path already exists
  const pageExists = await Page.findOne({ path: payload.path });
  if (pageExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Page path already exists!');
  }

  const newPage = new Page(payload);
  const result = await newPage.save();
  return result;
};

// Get all pages with filters
const getAllPages = async (
  tenantDomain: string,
  filters: IPageFilters = {},
) => {
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');
  const { searchTerm, category, status } = filters;

  const query: any = {};

  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { path: { $regex: searchTerm, $options: 'i' } },
      { route: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  if (category) query.category = category;
  if (status) query.status = status;

  return await Page.find(query).sort({ category: 1, name: 1 }).exec();
};

const getPageById = async (tenantDomain: string, id: string) => {
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  const result = await Page.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  return result;
};

const updatePage = async (
  tenantDomain: string,
  id: string,
  payload: Partial<IPage>,
) => {
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');

  const page = await Page.findById(id);
  if (!page) throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');

  if (payload.path && payload.path !== page.path) {
    const pageExists = await Page.findOne({ path: payload.path });
    if (pageExists)
      throw new AppError(httpStatus.BAD_REQUEST, 'Page path already exists!');
  }

  const result = await Page.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  return result;
};

const deletePage = async (tenantDomain: string, id: string) => {
  const { Model: Page } = await getTenantModel(tenantDomain, 'Page');
  const { Model: Role } = await getTenantModel(tenantDomain, 'Role');

  const page = await Page.findById(id);
  if (!page) throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');

  // Check if any role uses this page
  const rolesUsingPage = await Role.countDocuments({
    'permissions.pageId': new Types.ObjectId(id),
  });
  if (rolesUsingPage > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot delete page. It is used in ${rolesUsingPage} roles.`,
    );
  }

  const result = await Page.findByIdAndDelete(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Page not found!');
  return result;
};

export const PageService = {
  createPage,
  getAllPages,
  getPageById,
  updatePage,
  deletePage,
};
