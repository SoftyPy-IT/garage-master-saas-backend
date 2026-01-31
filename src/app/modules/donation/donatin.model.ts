import mongoose, { Schema } from 'mongoose';
import { TDonation } from './donation.interface';

export const DonationSchema: Schema = new Schema<TDonation>(
  {
    name: { type: String },
    mobile_number: { type: String },
    email: { type: String, },
    donation_country: { type: String, },
    address: { type: String},
    donation_purpose: { type: String, },
    donation_amount: { type: Number,  },
    referenceNo: { type: String, },
    payment_method: { type: String },
    bank_account_no: { type: String },
    check_no: { type: String },

    card_number: { type: String },
    card_holder_name: { type: String },
    card_transaction_no: { type: String },
    card_type: { type: String },
    month_first: { type: String },
    month_second: { type: String },
    year: { type: String },
    security_code: { type: String },
    transaction_no: { type: String },
    transactionId: { type: String },

    description: { type: String },
  },
  { timestamps: true }
);

export const Donation = mongoose.model<TDonation>('Donation', DonationSchema);
