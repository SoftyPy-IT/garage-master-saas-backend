import mongoose, { Schema, model } from "mongoose";
import { TCompanyProfile } from "./companyProfile.interface";

export const companyProfileSchema = new Schema<TCompanyProfile>({
  companyName: { type: String},
  companyNameBN: { type: String,  },
  email: { type: String, },
  phone: { type: String, },
  whatsapp: { type: String },
  website: { type: String, },
  address: { type: String, },
  description: { type: String,  },
  officeTime: { type: String, },
  logo: { type: [String] }, 
});

const CompanyProfile = mongoose.models.CompanyProfile || model("CompanyProfile", companyProfileSchema);
export default CompanyProfile;
