import { Document, Model } from 'mongoose';

export interface IPage {
  name: string;
  category: string;
  path: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface IPageMethods {
  // Add any instance methods here
}

export interface IPageModel extends Model<IPage, {}, IPageMethods> {
  isPageExistsByPath(path: string): Promise<IPageDocument | null>;
}

export interface IPageDocument extends IPage, Document, IPageMethods {}

export interface IPageFilters {
  searchTerm?: string;
  category?: string;
  status?: string;
  [key: string]: any;
}