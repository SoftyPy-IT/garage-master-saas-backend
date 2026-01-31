import { getTenantModel } from '../../utils/getTenantModels';

export const seedDefaultCompanyProfile = async (tenantId: string) => {


  try {
    const { Model: CompanyProfile } = await getTenantModel(tenantId, 'CompanyProfile');
   
    const existing = await CompanyProfile.findOne();
 
    if (existing) {
     
      return;
    }

    const created = await CompanyProfile.create({
      companyName: 'Default Garage Co.',
      companyNameBN: 'গ্যারেজ মাস্টার',
      email: 'default@garage.com',
      phone: '+8801234567890',
      whatsapp: '+8801234567890',
      website: 'https://defaultgarage.com',
      address: '123 Default Street, Dhaka, Bangladesh',
      description: 'Your trusted automotive service provider.',
      logo: '',
    });


  } catch (error) {
    console.error(`[Seeder] ❌ Failed to seed for tenant: ${tenantId}`, error);
  }
};
