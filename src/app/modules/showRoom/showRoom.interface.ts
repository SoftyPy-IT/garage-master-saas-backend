import { Types } from 'mongoose';
export interface TShowRoom {
  showRoomId: string;
  user_type: string;
  vehicles: Types.ObjectId[];
  jobCards: Types.ObjectId[];
  quotations: Types.ObjectId[];
  invoices: Types.ObjectId[];
  money_receipts: Types.ObjectId[];
  showRoom_name: string;
  vehicle_username: string;
  showRoom_address: string;
  company_name: string;
  company_address: string;
  company_country_code: string;
  company_contact: string;
  fullCompanyNum: string;
  company_email: string;
  driver_name: string;
  driver_contact: string;
  driver_country_code: string;
  reference_name: string;
  isRecycled: boolean;
  recycledAt: Date;
  whatsappNumber: number;
}
