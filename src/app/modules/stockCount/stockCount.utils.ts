/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import https from 'https';
import { parse } from 'json2csv';
import csvParser from 'csv-parser';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

import { cloudinaryConfig } from '../../utils/cloudinary';
import { Product } from '../product/product.model';

const uploadToCloudinary = async (filePath: string | Express.Multer.File) => {
  try {
    const publicId = `stock_files-${crypto.randomBytes(10).toString('hex')}`;
    let result: any;

    if (typeof filePath === 'string') {
      // Upload using a file path string
      result = await cloudinaryConfig.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: 'stock_files',
        public_id: publicId,
        overwrite: true,
      });
    } else if (filePath && filePath.path) {
      // Upload using an Express.Multer.File object's path
      result = await cloudinaryConfig.uploader.upload(filePath.path, {
        resource_type: 'raw',
        folder: 'stock_files',
        public_id: `${publicId}-${filePath.originalname}`,
        overwrite: true,
      });
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid file path or file object',
      );
    }

    if (!result) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Error uploading file to Cloudinary',
      );
    }

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Error uploading file to Cloudinary',
    );
  }
};

const parseCSV = (url: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          return reject(
            new AppError(
              httpStatus.BAD_REQUEST,
              `Failed to fetch CSV file: ${res.statusCode}`,
            ),
          );
        }

        res
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', () =>
            reject(
              new AppError(
                httpStatus.INTERNAL_SERVER_ERROR,
                'Error parsing CSV file',
              ),
            ),
          );
      })
      .on('error', (error) =>
        reject(new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message)),
      );
  });
};

const getProducts = async (stockData: any) => {
  try {
    const query: any = { isDeleted: false };

    if (stockData.type === 'Partial') {
      if (stockData.brands?.length > 0) {
        query.brand = { $in: stockData.brands };
      } else if (stockData.categories?.length > 0) {
        query.category = { $in: stockData.categories };
      }
    }

    if (stockData.startDate && stockData.endDate) {
    
      query.createdAt = {
        $gte: new Date(stockData.startDate),
        $lte: new Date(stockData.endDate),
      };
    }



    const products = await Product.find(query);

    if (!products || products.length === 0) {
      throw new AppError(httpStatus.NOT_FOUND, 'No products found');
    }

    return products;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Internal Server Error',
    );
  }
};

const generateCSVFile = async (products: any[]) => {
  try {
    const csvFields = ['Name', 'Code', 'Variants', 'Expected', 'Counted'];
    const csvData = products.map((product) => ({
      Name: product.name,
      Code: product.code,
      Variants: product.variants
        ?.map(
          (variant: any) =>
            `${variant.name} - ${variant.values.map((value: any) => value.name).join(', ')}`,
        )
        .join('; '),
      Expected: product.stock,
      Counted: '',
    }));

    const csv = parse(csvData, { fields: csvFields });
    const fileName = `stock_${Date.now()}.csv`;
    const filePath = path.join(__dirname, fileName);

    fs.writeFileSync(filePath, csv);

    return filePath;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error generating CSV file',
    );
  }
};

const calculateDifferences = async (initialData: any[], finalData: any[]) => {
  const differences = await Promise.all(
    initialData.map(async (initialProduct) => {
      const finalProduct = finalData.find(
        (p) => p.Code === initialProduct.Code,
      );
      if (!finalProduct) return null;

      const expected = parseInt(initialProduct.Expected, 10) || 0;
      const counted = parseInt(finalProduct.Counted, 10) || 0;
      const difference = counted - expected;

      // Find the product by name or code to get the product cost
      const product = await Product.findOne({
        $or: [{ name: initialProduct.Name }, { code: finalProduct.Code }],
      });
      const productCost = product ? product.productCost : 0;

      return {
        No: initialProduct.No,
        Description: initialProduct.Name,
        Expected: expected,
        Counted: counted,
        Difference: difference,
        Cost: productCost,
      };
    }),
  );

  return differences.filter((item) => item !== null);
};

export {
  uploadToCloudinary,
  parseCSV,
  getProducts,
  generateCSVFile,
  calculateDifferences,
};
