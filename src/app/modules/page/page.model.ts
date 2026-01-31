
import { Schema, model } from 'mongoose';
import { IPage } from './page.interface';

export const pageSchema = new Schema<IPage>(
  {
    name: {
      type: String,
      required: [true, 'Page name is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
    },
    path: {
      type: String,
      required: [true, 'Path is required'],
      unique: true,
      trim: true,
    },
    route: {
      type: String,
      required: [true, 'Route is required'],
      trim: true,
    },
    status: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Page = model<IPage>('Page', pageSchema);

export default Page;