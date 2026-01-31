import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import config from '../config';

cloudinary.config({
  cloud_name: config.cloudinary_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_secret,
});

export const ImageUpload = (
  imageName: string,
  path: string,
  folder: string,
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      path,
      {
        public_id: imageName.trim(),
        folder: `trust-auto/${folder}`,
      },
      function (error, result) {
        // Always try to delete the file
        fs.unlink(path, (err) => {
          if (err) {
          }
        });

        if (error) {
          reject(error);
        } else {
          resolve(result as UploadApiResponse);
        }
      },
    );
  });
};



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), '/uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage: storage,
}).single('image');

export const cloudinaryConfig = cloudinary;
