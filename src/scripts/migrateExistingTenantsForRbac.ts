import mongoose from 'mongoose';
import colors from 'colors';
import { ITenant } from '../app/modules/tenant/tenant.interface';
import { Tenant } from '../app/modules/tenant/tenant.model';
import { userSchema } from '../app/modules/user/user.model';
import { roleSchema } from '../app/modules/role/role.model';
import { pageSchema } from '../app/modules/page/page.model';
import { permissionSchema } from '../app/modules/permission/permission.model';
import { DEFAULT_PAGES, DEFAULT_ROLES } from '../app/utils/tenantSeedData';
import chalk from 'chalk'; 
// --- কনফিগারেশন ---
// আপনার সেন্ট্রাল ডাটাবেসের URI এখানে দিন
const CENTRAL_DB_URI = 'mongodb+srv://softypy_saas:saas_softypy33@cluster0.ywst3am.mongodb.net/saas-application?retryWrites=true&w=majority&appName=Cluster0';

async function migrateTenants() {
  try {
    // কোনো কালার ছাড়া সাধারণ কনসোল লগ
    console.log('🚀 Starting migration process...');
    await mongoose.connect(CENTRAL_DB_URI);
    console.log('✅ Connected to central database.');

    // ১. সব অ্যাক্টিভ টেনান্টদের খুঁজুন
    const tenants: ITenant[] = await Tenant.find({ isActive: true });
    if (tenants.length === 0) {
      console.log('ℹ️ No active tenants found to migrate.');
      return;
    }
    console.log(`📄 Found ${tenants.length} tenants to migrate.`);

    // ২. প্রতিটি টেনান্টের জন্য মাইগ্রেশন চালান
    for (const tenant of tenants) {
      console.log('\n----------------------------------------');
      console.log(`🔄 Migrating tenant: ${tenant.name} (${tenant.domain})`);
      await migrateSingleTenant(tenant);
    }

    console.log('\n🎉 Migration completed successfully for all tenants!');

  } catch (error: any) {
    console.error('❌ Migration failed!', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from the database.');
  }
}

async function migrateSingleTenant(tenant: ITenant) {
  const dbName = tenant.domain.replace(/\./g, '_');
  
  // টেনান্টের নিজস্ব ডাটাবেসে সুইচ করুন
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });

  // মডেল ডিফাইন করুন
  const UserModel = tenantDb.model('User', userSchema);
  const RoleModel = tenantDb.model('Role', roleSchema);
  const PageModel = tenantDb.model('Page', pageSchema);
  const PermissionModel = tenantDb.model('Permission', permissionSchema);

  try {
    // ৩. ডিফল্ট রোল তৈরি করুন (যদি না থাকে)
    const existingRoles = await RoleModel.find();
    if (existingRoles.length === 0) {
      await RoleModel.insertMany(DEFAULT_ROLES);
      console.log('  ✅ Created default roles.');
    } else {
      console.log('  ℹ️ Default roles already exist. Skipping.');
    }

    // ৪. ডিফল্ট পেজ তৈরি করুন (যদি না থাকে)
    const existingPages = await PageModel.find();
    if (existingPages.length === 0) {
      await PageModel.insertMany(DEFAULT_PAGES);
      console.log('  ✅ Created default pages.');
    } else {
      console.log('  ℹ️ Default pages already exist. Skipping.');
    }

    // ৫. 'Admin' রোল এবং সব পেজ খুঁজুন
    const adminRole = await RoleModel.findOne({ name: 'Admin' });
    const allPages = await PageModel.find();

    if (!adminRole) {
      throw new Error("'Admin' role not found after creation. Something is wrong.");
    }
    if (allPages.length === 0) {
      throw new Error("No pages found. Cannot assign permissions.");
    }

    // ৬. 'Admin' রোলকে সব পেজের জন্য পূর্ণ পারমিশন দিন
    const existingPermissions = await PermissionModel.find({ roleId: adminRole._id });
    if (existingPermissions.length === 0) {
      const permissionsToCreate = allPages.map(page => ({
        roleId: [adminRole._id],
        pageId: [page._id],
        create: true,
        edit: true,
        view: true,
        delete: true,
      }));
      await PermissionModel.insertMany(permissionsToCreate);
      console.log("  ✅ Granted full permissions to 'Admin' role.");
    } else {
      console.log("  ℹ️ Permissions for 'Admin' role already exist. Skipping.");
    }

    // ৭. সব বিদ্যমান ইউজারদের 'Admin' রোল দিন (যাদের রোল নেই)
    const usersWithoutRoles = await UserModel.find({ 
        roleId: { $exists: false, $eq: [] } 
    });
    if (usersWithoutRoles.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: usersWithoutRoles.map(u => u._id) } },
        { $set: { roleId: [adminRole._id] } }
      );
      console.log(`  ✅ Assigned 'Admin' role to ${usersWithoutRoles.length} existing users.`);
    } else {
      console.log('  ℹ️ All users already have roles. Skipping role assignment.');
    }

    console.log(`✅ Migration for ${tenant.domain} successful.`);

  } catch (error: any) {
    console.error(`❌ Migration failed for tenant ${tenant.domain}:`, error.message);
  }
}

// স্ক্রিপ্টটি চালান