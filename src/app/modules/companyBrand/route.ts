import express from 'express';
import { CompanyBrandValidations } from './validation';
import { companyBrandControllers } from './controller';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/',  validateRequest(CompanyBrandValidations.createCompanyBrandValidation),
  companyBrandControllers.createCompanyBrand
);
router.get('/', companyBrandControllers.getAllCompanyBrands);
router.delete('/:id', companyBrandControllers.deleteCompanyBrand);

export const companyBrandRoutes = router;
