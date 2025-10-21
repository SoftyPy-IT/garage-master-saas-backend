
import express from 'express';
import { UserController } from './user.controller';
import { auth } from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { userValidations } from './user.validation';
const router = express.Router();


router.get(
  '/:userId/permissions',
  auth('admin', 'superadmin', 'manager'),
  UserController.getUserPermissions,
);

router.post(
  '/',
  validateRequest(userValidations.createUserValidation),
  UserController.createUser,
);

router.get('/', auth('admin', 'superadmin', 'manager'), UserController.getAllUser);



router.delete('/:id', auth('admin'), UserController.deleteUser);

router.put('/:id', auth('admin', 'superadmin', 'manager'), UserController.updateUser);

router.post(
  '/:userId/role',
  auth('admin', 'superadmin', 'manager'),
  UserController.assignRoleToUser,
);

export const userRoutes = router;
