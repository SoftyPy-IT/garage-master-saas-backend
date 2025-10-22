import { ObjectId } from 'mongoose';

export type TProduct = {
  product_name: string;
  product_type: ObjectId;
  image: string;
  category: ObjectId;
  product_code: string;
  storageLocation: string;
  productStatus: string;
  brand: ObjectId;
  barcode: string[];
  tags: string[];
  unit: ObjectId;
  purchasePrice: number;
  sellingPrice: number;
  minimumSalePrice: number;
  expense: number;
  product_tax: number;
  tax_method: string;
  warranty: string;
  productDescription: string;
  specifications: string;
  discount: number;
  stock_alert: number;
  product_quantity: number;
  suppliers: ObjectId;
  warranties: ObjectId;
  warehouse: ObjectId;
  productCost: number;
  isDeleted: boolean;
  shipping: number;

  // Inventory Management Fields
  initialStock: number;
  reorderLevel: number;
  lastPurchaseDate?: string;
  lastSoldDate?: string;

  // Expiry-related Fields
  expiryDateType: 'fixed' | 'variable' | 'none';
  expiryDate?: string;
  manufacturingDate?: string;
  batchNumber?: string;
  shelfLife?: number;
  shelfLifeUnit?: 'Days' | 'Weeks' | 'Months' | 'Years';
  expiryAlertDays?: number;
};
