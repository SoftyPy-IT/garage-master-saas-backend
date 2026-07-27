import { Types } from 'mongoose';

export interface TQuotation {
  quotation_no: string;
  user_type: 'customer' | 'company' | 'showRoom';
  Id: string;

  job_no: string;
  date: string;
  customer: Types.ObjectId;
  company: Types.ObjectId;
  showRoom: Types.ObjectId;
  vehicle: Types.ObjectId;
tax:number;
  input_data: Array<{
    product: Types.ObjectId;
    warehouse: string;
    product_name: string;
    quantity: number;
    rate: number;
    unit: string;
    description: string;
    total: number;
    sellingPrice: number;
    batchNumber?: string;
  }>;

  service_input_data: Array<{
    product: Types.ObjectId;
    warehouse: string;
    product_name: string;
    quantity: number;
    description: string;
    rate: number;
    unit: string;
    total: number;
    sellingPrice: number;
    batchNumber?: string;
  }>;

  total_amount: number;
  parts_total: number;
  parts_total_In_words: string;
  service_total: number;
  service_total_in_words: string;
  discount: number;
  vat: number;
  net_total: number;
  logo: string;
  net_total_in_words: string;
  status: 'running' | 'completed';
  isCompleted: boolean;
  isRecycled: boolean;
    mileage:number;
  recycledAt: Date;
  isPending: boolean;
  pendingAt: Date;
}
