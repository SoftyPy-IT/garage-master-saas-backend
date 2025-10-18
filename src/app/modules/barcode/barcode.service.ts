
import { IBarcode } from './barcode.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { UploadApiResponse } from 'cloudinary';
import generateAndUploadBarcode from '../../utils/generateBarcode';
import { getTenantModel } from '../../utils/getTenantModels';
import mongoose from 'mongoose';

export const getAllBarcode = async (query: any, tenantDomain: string) => {
  const { Model: Barcode } = await getTenantModel(tenantDomain, "Barcode");
  const barcodeSearchableFields = ['name'];

  const barcodeQuery = new QueryBuilder(
    Barcode.find(), query,)
    .search(barcodeSearchableFields)
    // .filter()
    // .sort()
    .paginate()
    .fields();

  const meta = await barcodeQuery.countTotal();
  const barcodes = await barcodeQuery.modelQuery;

  return {
    meta,
    barcodes
  };
};


export const getBarcodeById = async (tenantDomain: string, id: string): Promise<IBarcode | null> => {
  const { Model: Barcode } = await getTenantModel(tenantDomain, "Barcode");
  const barcode = await Barcode.findOne({ _id: id, isDeleted: false });
  if (!barcode) {
    throw new AppError(httpStatus.NOT_FOUND, 'This barcode is not found');
  }
  return barcode;
};

export const createBarcode = async (
  tenantDomain: string,
  payload: IBarcode
): Promise<IBarcode | null> => {
  try {
    const { name, description, product_id } = payload;

    const { Model: Barcode } = await getTenantModel(tenantDomain, "Barcode");
    const { Model: Product } = await getTenantModel(tenantDomain, "Product");

    if (!product_id) {
      throw new AppError(httpStatus.BAD_REQUEST, "Product ID is required");
    }

    // Convert to ObjectId if it’s a string
    const productObjectId =
      typeof product_id === "string"
        ? new mongoose.Types.ObjectId(product_id)
        : product_id;

    const exist = await Barcode.findOne({ name });
    if (exist) {
      throw new AppError(
        httpStatus.CONFLICT,
        "The barcode already exists with this name"
      );
    }

    // Use productObjectId to query
    const product = await Product.findById(productObjectId);
    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, "This product is not found");
    }

    // Check if product already has a barcode
    const existingBarcode = await Barcode.findOne({ product_id: productObjectId });
    if (existingBarcode) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This product already has a barcode"
      );
    }

    // Generate barcode image and upload
    const result = (await generateAndUploadBarcode(
      productObjectId.toString()
    )) as UploadApiResponse;

    if (!result) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Error generating or uploading barcode"
      );
    }

    // Prepare and create barcode data
    const barcodeData = {
      name,
      slug:
        name.toLowerCase().replace(/ /g, "-") +
        "_barcode_" +
        Math.floor(Math.random() * 1000),
      description,
      product_id: productObjectId,
      barcode: {
        url: result.secure_url,
        public_id: result.public_id,
      },
    };

    const newBarcode = await Barcode.create(barcodeData);
    return newBarcode;
  } catch (error: any) {
    console.error("❌ Barcode creation failed:", error.message);
    throw new AppError(
      error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
      error.message
    );
  }
};

export const updateBarcode = async (tenantDomain: string, id: string) => { };

export const deleteBarcode = async (tenantDomain: string, id: string) => {
  const { Model: Barcode } = await getTenantModel(tenantDomain, "Barcode");
  const barcode = await Barcode.findOne({ _id: id, isDeleted: false });
  if (!barcode) {
    throw new AppError(httpStatus.NOT_FOUND, 'This barcode does not exist');
  }

  await Barcode.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

  return null;
};

export const barcodeService = {
  getAllBarcode,
  getBarcodeById,
  createBarcode,
  updateBarcode,
  deleteBarcode,
};
