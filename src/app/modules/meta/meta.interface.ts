import { Types } from 'mongoose';

export interface UnifiedData {
  id: string; 
  userType: string; 
  name: string;
  vehicles: Types.ObjectId[]; 
  jobCards: Types.ObjectId[]; 
  quotations: Types.ObjectId[];
  invoices: Types.ObjectId[]; 
  moneyReceipts: Types.ObjectId[]; 
  address: string;
  contact: string; 
  countryCode: string; 
  email: string;
  driverName: string; 
  driverContact: string;
  driverCountryCode: string;
  referenceName: string; 
  isRecycled: boolean; 
  recycledAt: Date; 
  type: 'Customer' | 'Company' | 'ShowRoom';
}
 export  interface CustomerType {
    _id: any;
    customerId: string;
    user_type: string;
    customer_name: string;
    vehicles: VehicleType[];
    jobCards?: any[];
    quotations?: any[];
    invoices?: any[];
    money_receipts?: any[];
    customer_address?: string;
    fullCustomerNum?: string;
    customer_country_code?: string;
    customer_email?: string;
    driver_name?: string;
    driver_contact?: string;
    driver_country_code?: string;
    vehicle_username?: string;
    reference_name?: string;
    isRecycled?: boolean;
    recycledAt?: Date;
    customer_contact?: string;
    [key: string]: any;
  }

 export  interface CompanyType {
    _id: any;
    companyId: string;
    user_type: string;
    company_name: string;
    vehicles: VehicleType[];
    jobCards?: any[];
    quotations?: any[];
    invoices?: any[];
    money_receipts?: any[];
    company_address?: string;
    fullCompanyNum?: string;
    company_country_code?: string;
    company_email?: string;
    driver_name?: string;
    driver_contact?: string;
    driver_country_code?: string;
    vehicle_username?: string;
    reference_name?: string;
    isRecycled?: boolean;
    recycledAt?: Date;
    company_contact?: string;
    [key: string]: any;
    
  }

 export  interface ShowRoomType {
    _id: any;
    showRoomId: string;
    user_type: string;
    showRoom_name: string;
    vehicles: VehicleType[];
    jobCards?: any[];
    quotations?: any[];
    invoices?: any[];
    money_receipts?: any[];
    showRoom_address?: string;
    fullCompanyNum?: string;
    company_country_code?: string;
    company_email?: string;
    driver_name?: string;
    driver_contact?: string;
    driver_country_code?: string;
    vehicle_username?: string;
    reference_name?: string;
    isRecycled?: boolean;
    recycledAt?: Date;
    company_contact?: string;
    [key: string]: any;
  }
  export interface VehicleType {
    fullRegNum?: string;
    car_registration_no?: string;
    [key: string]: any;
  }