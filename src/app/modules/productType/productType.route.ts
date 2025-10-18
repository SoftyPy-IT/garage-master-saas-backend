import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { upload } from '../../utils/ImageUpload';
import { productTypeControllers } from './productType.controller';
import { ProductTypeValidations } from './productType.validation';
import { auth } from '../../middlewares/auth';
import { checkPermission } from '../../middlewares/checkPermission';
const router = express.Router();
router.post(
  '/',
  upload,
    auth('admin', 'superadmin'),
    checkPermission('/dashboard/product-type', 'create'),
  validateRequest(ProductTypeValidations.createProductType),
  productTypeControllers.createProductType,
);
router.get('/', productTypeControllers.getAllProductType);
router.get('/:id', productTypeControllers.getSingleProductType);
router.delete('/:id', productTypeControllers.deleteProductType);
router.patch(
  '/:id',
  validateRequest(ProductTypeValidations.updateProductType),
  productTypeControllers.updateProductType,
);

export const productTypeRoutes = router;
