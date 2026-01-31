/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, model } from 'mongoose';
import { TProduct } from './product.interface';

export const ProductSchema = new Schema<TProduct>(
  {
    product_name: {
      type: String,
    },
    product_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductType',
    },
    image: {
      type: String,
        required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    suppliers: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    warranties: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warranty',
    },
    product_code: {
      type: String,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
    },
    tags: {
      type: [String],
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    purchasePrice: {
      type: Number,
    },
    expense: {
      type: Number,
    },
    sellingPrice: {
      type: Number,
    },
    minimumSalePrice: {
      type: Number,
    },

    product_tax: {
      type: Number,
    },
    shipping: {
      type: Number,
    },
    product_quantity: {
      type: Number,
    },
    tax_method: {
      type: String,
    },
    storageLocation: {
      type: String,
    },
    productStatus: {
      type: String,
    },
    warranty: {
      type: String,
    },
    productDescription: {
      type: String,
    },
    specifications: {
      type: String,
    },
    discount: {
      type: Number,
    },

    // Inventory fields
    initialStock: {
      type: Number,
      default: 0,
    },
    reorderLevel: {
      type: Number,
    },
    stock_alert: {
      type: Number,
    },
    lastPurchaseDate: {
      type: Date,
    },
    lastSoldDate: {
      type: Date,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    expiryDateType: {
      type: String,
      enum: ['fixed', 'variable', 'none'],

    },
    expiryDate: {
      type: String,
    },
    manufacturingDate: {
      type: String,
    },
    shelfLife: {
      type: Number,
    },
    shelfLifeUnit: {
      type: String,
    },
    expiryAlertDays: {
      type: Number,
    },
    batchNumber: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Product = model<TProduct>('Product', ProductSchema);
