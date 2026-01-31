
import bcrypt from 'bcrypt';
import { User } from './user.model';
import config from '../../config';

export const seedSuperAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'superadmin' });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(
      config.super_admin_password as string,
      Number(config.default_pass)
    );

    await User.create({
      name: 'superadmin',
      email: 'superadmin@gmail.com',
      password: '123456',
      role: 'superadmin',
      createdBy: 'system',
      status: 'active',
      tenantDomain: 'superadmin', 
    });

  
  } 
};
