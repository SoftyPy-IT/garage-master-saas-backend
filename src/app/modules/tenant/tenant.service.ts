import { ITenant } from './tenant.interface';
import { Tenant } from './tenant.model';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { createSubscription } from '../subscription/subscription.service';
import { connectToTenantDatabase } from '../../../server';
import mongoose from 'mongoose';
import { userSchema } from '../user/user.model';
import { subscriptionSchema } from '../subscription/subscription.model';
import { getTenantModel } from '../../utils/getTenantModels';

export const createTenant = async (
  payload: ITenant,
  plan: 'Monthly' | 'HalfYearly' | 'Yearly',
) => {
  try {
    const { name, domain, user: userPayload } = payload;

    if (!domain || typeof domain !== 'string') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Domain is required and must be a string',
      );
    }

    // Check if domain already exists
    const existingTenant = await Tenant.findOne({ domain });
    if (existingTenant) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Domain already registered');
    }

    // Generate tenant DB URI
    const dbName = domain.replace(/\./g, '_');
    const dbUri = `mongodb+srv://softypy_saas:saas_softypy33@cluster0.ywst3am.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;

    // Connect to tenant DB
    const connection = await connectToTenantDatabase(domain, dbUri);

    // Register UserModel and SubscriptionModel to tenant DB
    const UserModel = connection.model('User', userSchema);
    const SubscriptionModel = connection.model(
      'Subscription',
      subscriptionSchema,
    );

    // Prepare subscription
    const subscription = createSubscription(
      plan,
      payload.subscription?.isPaid || false,
      payload.subscription?.paymentMethod || 'Manual',
      payload.subscription?.amount || 0,
    );

    // Create Tenant (in main DB)
    const tenant = new Tenant({
      name,
      domain,
      businessType: payload.businessType,
      dbUri,
      subscription,
      isActive: true,
    });
    await tenant.save();

    // Create Admin User (in tenant DB)
    const fullName = `${userPayload.firstName} ${userPayload.lastName}`.trim();
    const newUser = await UserModel.create({
      name: fullName,
      email: userPayload.email,
      password: userPayload.password,
      tenantDomain: domain,
      tenantId: tenant._id,
      tenantInfo: {
        name: tenant.name,
        domain: tenant.domain,
        businessType: tenant.businessType,
        dbUri: tenant.dbUri,
        isActive: tenant.isActive,
        subscription,
      },
      createdBy: 'self',
      role: 'admin',
    });

    // Create Subscription (in tenant DB)
    await SubscriptionModel.create({
      ...subscription,
      user: newUser._id,
    });

  
    return tenant;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Error creating tenant',
    );
  }
};

const getAllTenant = async (query: Record<string, unknown>) => {
  const tenantQuery = new QueryBuilder(Tenant.find(), query)
    .search(['name'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await tenantQuery.countTotal();
  const tenants = await tenantQuery.modelQuery;

  return { meta, tenants };
};

const getSingleTenant = async (id: string) => {
  const tenant = await Tenant.findById(id);
  if (!tenant) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  }
  return tenant;
};

export const updateTenant = async (id: string, payload: Partial<ITenant>) => {
  // Check if tenant exists
  const existingTenant = await Tenant.findById(id);
  if (!existingTenant) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  // Preserve user count if not provided
  if (payload.subscription) {
    payload.subscription.user =
      payload.subscription.user || existingTenant.subscription.user;
  }

  const { user, ...filteredPayload } = payload as any;

  //  Update tenant in central DB
  const updatedTenant = await Tenant.findByIdAndUpdate(id, filteredPayload, {
    new: true,
    runValidators: true,
  });

  // Update ONE user inside the tenant DB who matches the domain
  const tenantDomain = updatedTenant?.domain;

  if (tenantDomain) {
    try {
      const { Model: UserModel } = await getTenantModel(tenantDomain, 'User');

      // Only update the user where both tenantDomain and tenantInfo.domain match
      await UserModel.updateOne(
        {
          tenantDomain: tenantDomain,
          'tenantInfo.domain': tenantDomain,
        },
        {
          $set: {
            'tenantInfo.subscription': updatedTenant.subscription,
          },
        },
      );
    } catch (err) {
      console.error('❌ Failed to update tenant user info:', err);
    }
  }

  return updatedTenant;
};

const deleteTenant = async (id: string) => {
  const result = await Tenant.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  }
  return { message: 'Tenant deleted successfully' };
};

const renewTenantSubscription = async (
  tenantId: string,
  plan?: 'Monthly' | 'HalfYearly' | 'Yearly',
) => {
  const tenant = await Tenant.findById(tenantId);


  if (!tenant) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tenant not found');
  }

  const selectedPlan = plan || tenant.subscription?.plan;
  if (!['Monthly', 'HalfYearly', 'Yearly'].includes(selectedPlan)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid subscription plan');
  }

  const startDate = new Date();
  const endDate = new Date(startDate);

  // Set subscription end date based on plan
  switch (selectedPlan) {
    case 'Monthly':
      endDate.setMonth(startDate.getMonth() + 1);
      break;
    case 'HalfYearly':
      endDate.setMonth(startDate.getMonth() + 6);
      break;
    case 'Yearly':
      endDate.setFullYear(startDate.getFullYear() + 1);
      break;
    default:
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Unsupported subscription plan',
      );
  }

  // Define plan amounts
  const PLAN_PRICES: Record<string, number> = {
    Monthly: 2000,
    HalfYearly: 12000,
    Yearly: 24000,
  };

  // Update subscription in tenant
  tenant.subscription = {
    ...tenant.subscription,
    plan: selectedPlan,
    startDate,
    endDate,
    status: 'Active',
    isPaid: true,
    isActive: true,
    paymentMethod: 'Manual',
    amount: PLAN_PRICES[selectedPlan],
  };

  await tenant.save();
  return tenant.subscription;
};

export const TenantServices = {
  createTenant,
  getAllTenant,
  getSingleTenant,
  updateTenant,
  deleteTenant,
  renewTenantSubscription,
};
