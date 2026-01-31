import mongoose, { Schema } from 'mongoose';
import { TCompany } from './company.interface';

export const companySchema: Schema<TCompany> = new Schema<TCompany>(
  {
    companyId: {
      type: String,
      unique: true,
      required: [true, 'Company Id is required.'],
    },

    user_type: {
      type: String,
      default: 'company',
      required: true,
    },
    vehicles: [
      {
        type: Schema.ObjectId,
        ref: 'Vehicle',
        required: true,
      },
    ],
    jobCards: [
      {
        type: Schema.ObjectId,
        ref: 'JobCard',
        required: true,
      },
    ],
    quotations: [
      {
        type: Schema.ObjectId,
        ref: 'Quotation',
      },
    ],
    invoices: [
      {
        type: Schema.ObjectId,
        ref: 'Invoice',
      },
    ],
    money_receipts: [
      {
        type: Schema.ObjectId,
        ref: 'MoneyReceipt',
      },
    ],

    // Customer Information

    company_name: {
      type: String,
    },
    vehicle_username: {
      type: String,
    },
    company_address: {
      type: String,
    },
    company_country_code: {
      type: String,
    },
    company_contact: {
      type: String,
    },
    fullCompanyNum: {
      type: String,
    },
    company_email: {
      type: String,
    },

    driver_name: {
      type: String,
    },
    driver_country_code: {
      type: String,
    },
    driver_contact: {
      type: String,
    },
    companyOwnerName: {
      type: String,
    },
    companyOwnerCountryCode: {
      type: String,
    },
    companyOwnerPhone: {
      type: String,
    },
    reference_name: {
      type: String,
    },
        whatsappNumber: {
      type: Number,
    },
    isRecycled: { type: Boolean, default: false },
    recycledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

// Pre-save middleware to concatenate company_country_code and company_contact
companySchema.pre('save', function (next) {
  if (this.company_country_code && this.company_contact) {
    this.fullCompanyNum = `${this.company_country_code}${this.company_contact}`;
  } else {
    this.fullCompanyNum = '';
  }
  next();
});

companySchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as {
    company_country_code?: string;
    company_contact?: string;
    fullCompanyNum?: string;
    $set?: Partial<TCompany>;
  };

  if (
    update.$set &&
    update.$set.company_country_code &&
    update.$set.company_contact
  ) {
    update.$set.fullCompanyNum = `${update.$set.company_country_code}${update.$set.company_contact}`;
  } else if (update.company_country_code && update.company_contact) {
    update.fullCompanyNum = `${update.company_country_code}${update.company_contact}`;
  }

  next();
});

export const Company = mongoose.model<TCompany>('Company', companySchema);
