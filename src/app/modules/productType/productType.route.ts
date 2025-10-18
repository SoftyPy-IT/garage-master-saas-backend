import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { upload } from '../../utils/ImageUpload';
import { productTypeControllers } from './productType.controller';
import { ProductTypeValidations } from './productType.validation';
const router = express.Router();
router.post(
  '/',
  upload,
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
