import { ObjectId } from 'mongoose';

export interface TSupplierPayment {
  amount: number;
  date: Date;
  method: string;
  transactionId?: string;
  accountNumber?: string;
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  cvv?: string;
  checkNumber?: string;
  bankName?: string;
  mobileNumber?: string;
  note?: string;
  isPartial: boolean;
}
export interface TSupplier {
  supplierId: string;
  full_name: string;
  contact_person_name: string;
  products: ObjectId;
  orders: ObjectId;
  purchases: ObjectId;
  purchaseReturn: ObjectId;
  totalDue: number;
  totalPaid: number;
  balance: number;
  country_code?: string;
  phone_number: string;
  full_Phone_number?: string;
  email?: string;
  tax_id?: string;
  street_address: string;
  country: string;
  state?: string;
  city: string;
  postal_code?: string;
  isRecycled: boolean;
  bank_name?: string;
  account_number?: string;
  swift_code?: string;
  supplier_status: 'active' | 'inactive';
  note: string;
  recycledAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  payments?: TSupplierPayment[];

}
