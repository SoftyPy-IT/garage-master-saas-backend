import mongoose, { Schema } from 'mongoose';
import { TCustomer } from './customer.interface';

export const customerSchema: Schema<TCustomer> = new Schema<TCustomer>(
  {
    customerId: {
      type: String,
      unique: true,
      required: [true, 'Customer Id is required.'],
    },

    user_type: {
      type: String,
      default: 'customer',
      required: true,
    },

    note: {
      type: Schema.ObjectId,
      ref: 'Note',
    },
    vehicles: [
      {
        type: Schema.ObjectId,
        ref: 'Vehicle',
      },
    ],
    jobCards: [
      {
        type: Schema.ObjectId,
        ref: 'JobCard',
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
    customer_name: {
      type: String,
      required: [true, 'Customer name is required.'],
    },
    customer_email: {
      type: String,
    },
    customer_address: {
      type: String,
    },

    company_name: {
      type: String,
    },
    vehicle_username: {
      type: String,
    },
    company_address: {
      type: String,
    },

    customer_country_code: {
      type: String,
    },
    customer_contact: {
      type: String,
      required: [true, 'Customer contact number is required.'],
    },
    fullCustomerNum: {
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
    customerOwnerName: {
      type: String,
    },
    customerOwnerCountryCode: {
      type: String,
    },
    customerOwnerPhone: {
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
customerSchema.pre('save', function (next) {
  if (this.customer_country_code && this.customer_contact) {
    this.fullCustomerNum = `${this.customer_country_code}${this.customer_contact}`;
  } else {
    this.fullCustomerNum = '';
  }
  next();
});

// Pre-update middleware
customerSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as {
    customer_country_code: string;
    customer_contact: string;
    fullCustomerNum: string;
    $set?: Partial<TCustomer>;
  };

  if (
    update.$set &&
    update.$set.customer_country_code &&
    update.$set.customer_contact
  ) {
    update.$set.fullCustomerNum = `${update.$set.customer_country_code}${update.$set.customer_contact}`;
  } else if (update.customer_country_code && update.customer_contact) {
    update.fullCustomerNum = `${update.customer_country_code}${update.customer_contact}`;
  }

  next();
});

export const Customer = mongoose.model<TCustomer>('Customer', customerSchema);
