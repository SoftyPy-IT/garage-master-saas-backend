/* eslint-disable no-undef */
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import fs from 'fs';
import multer from 'multer';
import httpStatus from 'http-status';
import config from '../config';
import AppError from '../errors/AppError';
import path from 'path';

cloudinary.config({
  cloud_name: config.cloudinary_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_secret
});

const deleteFile = (path: string) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.error(`Failed to delete file at ${path}:`, err);
    } 
  });
};

export const sendImageToCloudinary = async (
  imageName: string,
  path: string,
  folder: string
): Promise<UploadApiResponse> => {
  try {
    const result = await cloudinary.uploader.upload(path, {
      public_id: imageName.trim(),
      folder: `softypy/${folder}`
    });
    deleteFile(path);
    return result;
  } catch (error) {
    deleteFile(path);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload image to Cloudinary');
  }
};

export const deleteImageFromCloudinary = async (
  publicId: string
): Promise<UploadApiResponse | UploadApiErrorResponse> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete image from Cloudinary');
  }
};

export const saveAttachment = async (file: Express.Multer.File): Promise<UploadApiResponse> => {
  const path = file.path;
  const uniqueFilename = new Date().toISOString();

  try {
    const result = await cloudinary.uploader.upload(path, {
      public_id: uniqueFilename,
      folder: 'softypy/attachments'
    });
    deleteFile(path);
    return result;
  } catch (error) {
    deleteFile(path);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to upload attachment to Cloudinary'
    );
  }
};

export const deleteAttachment = async (
  publicId: string
): Promise<UploadApiResponse | UploadApiErrorResponse> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete attachment from Cloudinary'
    );
  }
};

export const upload = multer({
  storage: multer.diskStorage({}),
  limits: {
    fileSize: 1024 * 1024 * 3, // 3MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|webp|gif/;
    const mimeType = allowedImageTypes.test(file.mimetype);
    const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase());

    const allowedCsvType = /csv/;
    const isCsvFile = allowedCsvType.test(file.mimetype);

    if ((mimeType && extname) || isCsvFile) {
      return cb(null, true);
    } else {
      cb(
        new AppError(
          httpStatus.BAD_REQUEST,
          'Only images and CSV files are allowed. Supported formats are jpeg, jpg, png, webp, gif, and csv'
        )
      );
    }
  }
});

export const cloudinaryConfig = cloudinary;
