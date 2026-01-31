import { Types } from 'mongoose';
export interface TCompany {
  companyId: string;
  user_type: string;
  vehicles: Types.ObjectId[];
  jobCards: Types.ObjectId[];
  quotations: Types.ObjectId[];
  invoices: Types.ObjectId[];
  money_receipts: Types.ObjectId[];
  company_name: string;
  vehicle_username: string;
  company_address: string;
  company_country_code: string;
  company_contact: string;
  fullCompanyNum: string;
  company_email: string;
  driver_name: string;
  driver_contact: string;
  driver_country_code: string;
  companyOwnerCountryCode:string;
  companyOwnerName:string;
  companyOwnerPhone:string;
  reference_name: string;
  isRecycled: boolean;
  recycledAt: Date;
    whatsappNumber:number;
}
