import mongoose from 'mongoose';
import { ITenant } from '../app/modules/tenant/tenant.interface';
import { Tenant } from '../app/modules/tenant/tenant.model';
import { userSchema } from '../app/modules/user/user.model';
import { roleSchema } from '../app/modules/role/role.model';
import { pageSchema } from '../app/modules/page/page.model';
import { permissionSchema } from '../app/modules/permission/permission.model';
import { DEFAULT_PAGES, DEFAULT_ROLES } from '../app/utils/tenantSeedData';
import chalk from 'chalk';

const CENTRAL_DB_URI =
  'mongodb+srv://softypy_saas:saas_softypy33@cluster0.ywst3am.mongodb.net/saas-application?retryWrites=true&w=majority&appName=Cluster0';

async function migrateTenants() {
  try {
    await mongoose.connect(CENTRAL_DB_URI);

    const tenants: ITenant[] = await Tenant.find({ isActive: true });
    if (tenants.length === 0) {
      return;
    }
    for (const tenant of tenants) {
      await migrateSingleTenant(tenant);
    }
  } catch (error: any) {
  } finally {
    await mongoose.disconnect();
  }
}

async function migrateSingleTenant(tenant: ITenant) {
  const dbName = tenant.domain.replace(/\./g, '_');
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  const UserModel = tenantDb.model('User', userSchema);
  const RoleModel = tenantDb.model('Role', roleSchema);
  const PageModel = tenantDb.model('Page', pageSchema);
  const PermissionModel = tenantDb.model('Permission', permissionSchema);

  try {
    const existingRolesCount = await RoleModel.countDocuments();
    if (existingRolesCount === 0) {
      await RoleModel.insertMany(DEFAULT_ROLES);
    } else {
    }
    const existingPagesCount = await PageModel.countDocuments();
    if (existingPagesCount === 0) {
      await PageModel.insertMany(DEFAULT_PAGES);
    }

    const adminRole = await RoleModel.findOne({ name: 'Admin' });
    const allPages = await PageModel.find();

    if (!adminRole) {
      throw new Error("'Admin' role not found. Something is wrong.");
    }
    if (allPages.length === 0) {
      throw new Error('No pages found. Cannot assign permissions.');
    }
    const existingPermissionsCount = await PermissionModel.countDocuments({
      roleId: adminRole._id,
    });
    if (existingPermissionsCount === 0) {
      const permissionsToCreate = allPages.map((page) => ({
        roleId: [adminRole._id],
        pageId: [page._id],
        create: true,
        edit: true,
        view: true,
        delete: true,
      }));
      await PermissionModel.insertMany(permissionsToCreate);
    }

    const updateResult = await UserModel.updateMany(
      { roleId: { $ne: adminRole._id } },
      { $addToSet: { roleId: adminRole._id } },
    );

    if (updateResult.modifiedCount > 0) {
    }
  } catch (error: any) {
    console.error(
      chalk.red.bold(` Migration failed for tenant ${tenant.domain}:`),
      error.message,
    );
  }
}
migrateTenants();
