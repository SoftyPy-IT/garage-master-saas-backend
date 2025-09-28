import express from 'express';

import validateRequest from '../../middlewares/validateRequest';
import { PageValidation } from './page.validation';
import { PageController } from './page.controller';
import { auth } from '../../middlewares/auth';

const router = express.Router();

// Create a new page
router.post(
  '/',
//   validateRequest(PageValidation.createPageZodSchema),
  auth('admin'),
  PageController.createPage
);

// Get all pages with filtering and pagination
router.get(
  '/',
  auth('admin', 'manager'),
  PageController.getAllPages
);

// Get all pages for dropdown options
router.get(
  '/options',
  auth('admin', 'manager'),
  PageController.getAllPagesForOptions
);

// Get pages by category
router.get(
  '/category/:category',
  auth('admin', 'manager'),
  PageController.getPagesByCategory
);

// Get a single page by ID
router.get(
  '/:id',
  auth('admin', 'manager'),
  PageController.getPageById
);

// Update a page
router.put(
  '/:id',
//   validateRequest(PageValidation.updatePageZodSchema),
  auth('admin'),
  PageController.updatePage
);

// Delete a page
router.delete(
  '/:id',
  auth('admin'),
  PageController.deletePage
);

export const PageRoutes = router;