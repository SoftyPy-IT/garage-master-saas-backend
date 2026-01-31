import mongoose from 'mongoose';
import { ITenant } from '../app/modules/tenant/tenant.interface';
import { Tenant } from '../app/modules/tenant/tenant.model';
import { userSchema } from '../app/modules/user/user.model';
import { roleSchema } from '../app/modules/role/role.model';
import { pageSchema } from '../app/modules/page/page.model';
import { permissionSchema } from '../app/modules/permission/permission.model';
import { DEFAULT_PAGES, DEFAULT_ROLES } from '../app/utils/tenantSeedData';
import chalk from 'chalk';

const CENTRAL_DB_URI = 'mongodb+srv://softypy_saas:saas_softypy33@cluster0.ywst3am.mongodb.net/saas-application?retryWrites=true&w=majority&appName=Cluster0';

async function migrateTenants() {
  try {
    console.log(chalk.cyan.bold(' Starting migration process for all existing tenants...'));
    await mongoose.connect(CENTRAL_DB_URI);
    console.log(chalk.green(' Connected to central database.'));


    const tenants: ITenant[] = await Tenant.find({ isActive: true });
    if (tenants.length === 0) {
      console.log(chalk.yellow(' No active tenants found to migrate.'));
      return;
    }
    console.log(chalk.blue(`Found ${tenants.length} tenants to migrate.`));
    for (const tenant of tenants) {
      console.log(chalk.gray('\n----------------------------------------'));
      console.log(chalk.magenta.bold(` Migrating tenant: ${tenant.name} (${tenant.domain})`));
      await migrateSingleTenant(tenant);
    }

    console.log(chalk.green.bold('\n Migration completed successfully for all tenants!'));

  } catch (error: any) {
    console.error(chalk.red.bold(' Migration failed!'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.gray('🔌 Disconnected from the database.'));
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
      console.log(chalk.green(' Created default roles (Admin, Manager, Employee).'));
    } else {
      console.log(chalk.yellow(' Default roles already exist. Skipping role creation.'));
    }
    const existingPagesCount = await PageModel.countDocuments();
    if (existingPagesCount === 0) {
      await PageModel.insertMany(DEFAULT_PAGES);
      console.log(chalk.green(` Created ${DEFAULT_PAGES.length} default pages.`));
    } else {
      console.log(chalk.yellow(' Default pages already exist. Skipping page creation.'));
    }

    const adminRole = await RoleModel.findOne({ name: 'Admin' });
    const allPages = await PageModel.find();

    if (!adminRole) {
      throw new Error("'Admin' role not found. Something is wrong.");
    }
    if (allPages.length === 0) {
      throw new Error("No pages found. Cannot assign permissions.");
    }
    const existingPermissionsCount = await PermissionModel.countDocuments({ roleId: adminRole._id });
    if (existingPermissionsCount === 0) {
      const permissionsToCreate = allPages.map(page => ({
        roleId: [adminRole._id],
        pageId: [page._id],
        create: true,
        edit: true,
        view: true,
        delete: true,
      }));
      await PermissionModel.insertMany(permissionsToCreate);
      console.log(chalk.green(`   Granted full permissions to 'Admin' role for all ${allPages.length} pages.`));
    } else {
      console.log(chalk.yellow(" Permissions for 'Admin' role already exist. Skipping permission assignment."));
    }

    const updateResult = await UserModel.updateMany(
      { roleId: { $ne: adminRole._id } },
      { $addToSet: { roleId: adminRole._id } }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(chalk.green(`   Assigned 'Admin' role to ${updateResult.modifiedCount} existing users.`));
    } else {
      console.log(chalk.yellow('  ℹ All existing users already have the Admin role. Skipping role assignment.'));
    }

    console.log(chalk.green.bold(` Migration for ${tenant.domain} successful.`));

  } catch (error: any) {
    console.error(chalk.red.bold(` Migration failed for tenant ${tenant.domain}:`), error.message);
  }
}
migrateTenants();