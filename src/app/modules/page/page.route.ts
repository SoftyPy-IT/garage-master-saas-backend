// src/modules/page/page.routes.ts
import express from 'express';
import { PageController } from './page.controller';
import { auth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { createPageZodSchema } from './page.validation';
const router = express.Router();

router.post(
  '/',
  auth('admin', 'superadmin'),
  validateRequest(createPageZodSchema),
  PageController.createPage,
);

router.get('/', auth('admin', 'superadmin'), PageController.getAllPages);

router.get('/:id', auth('admin', 'manager'), PageController.getPageById);

router.delete(
  '/:id',
  auth('admin', 'superadmin'),
  PageController.deletePage,
);
router.patch(
  '/:id',
  auth('admin', 'superadmin'),
  PageController.updatePage,
);


export const PageRoutes = router;
