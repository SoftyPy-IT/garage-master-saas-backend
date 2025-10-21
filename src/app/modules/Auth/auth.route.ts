import express from 'express';
import { AuthValidation } from './auth.validation';
import { AuthController } from './auth.controller';
import validateRequest from '../../middlewares/validateRequest';

const router = express.Router();

router.post(
  '/login',
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginUser,
);
router.post("/logout", AuthController.logoutUser);
router.get("/me", AuthController.tokenVerify);
router.post('/refresh-token', AuthController.refreshToken);


export const authRoutes = router;
