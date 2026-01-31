import { Schema, model } from 'mongoose';
import { ICompanyBrand } from './interface';

const companyBrandSchema = new Schema<ICompanyBrand>(
  {
    logo: { type: String },
  },
  { timestamps: true }
);

export const CompanyBrand = model<ICompanyBrand>('CompanyBrand', companyBrandSchema);
