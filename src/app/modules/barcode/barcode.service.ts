import Barcode from './barcode.model';
import { IBarcode } from './barcode.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Request } from 'express';
import { UploadApiResponse } from 'cloudinary';
import { Product } from '../product/product.model';
import generateAndUploadBarcode from '../../utils/generateBarcode';

export const getAllBarcode = async (
  query: Record<string, unknown>,
): Promise<{ meta: any; barcodes: any[] }> => {
  const barcodeSearchableFields = ['name'];

  const barcodeQuery = new QueryBuilder(
    Barcode.find({
      isDeleted: false,
    }), query, )
    .search(barcodeSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await barcodeQuery.countTotal();
  const barcodes = await barcodeQuery.modelQuery;

  return { 
    meta, 
    barcodes 
  };
};


export const getBarcodeById = async (id: string): Promise<IBarcode | null> => {
  const barcode = await Barcode.findOne({ _id: id, isDeleted: false });
  if (!barcode) {
    throw new AppError(httpStatus.NOT_FOUND, 'This barcode is not found');
  }
  return barcode;
};

export const createBarcode = async (req: Request): Promise<IBarcode | null> => {
  try {
    const { name, description, product_id } = req.body;
    if (await Barcode.isBarcodeExist(name)) {
      throw new AppError(
        httpStatus.CONFLICT,
        'The barcode already exists with this name',
      );
    }

    const product = await Product.findById(product_id);
    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, 'This product is not found');
    }

    const productBarcode = await Barcode.findOne({ product_id });
    if (productBarcode) {
      throw new AppError(
        httpStatus.CONFLICT,
        'This product already has a barcode',
      );
    }

    const result = (await generateAndUploadBarcode(
      product_id,
    )) as UploadApiResponse;
    if (!result) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Error generating or uploading barcode',
      );
    }

    const barcodeData = {
      name,
      slug:
        name.toLowerCase().replace(/ /g, '-') +
        '_barcode_' +
        Math.floor(Math.random() * 1000),
      description,
      product_id,
      barcode: {
        url: result.secure_url,
        public_id: result.public_id,
      },
    };
    const data = await Barcode.create(barcodeData);
    return data;
  } catch (error: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const updateBarcode = async () => {};

export const deleteBarcode = async (id: string): Promise<void | null> => {
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
