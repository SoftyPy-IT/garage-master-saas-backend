import { Schema, model } from 'mongoose';
import { IPage, IPageMethods, IPageModel } from './page.interface';

const pageSchema = new Schema<IPage, IPageModel, IPageMethods>(
  {
    name: {
      type: String,
      required: [true, 'Page name is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    path: {
      type: String,
      required: [true, 'Path is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Check if page exists by path
pageSchema.statics.isPageExistsByPath = async function (path: string) {
  return await this.findOne({ path });
};

const Page = model<IPage, IPageModel>('Page', pageSchema);

export default Page;