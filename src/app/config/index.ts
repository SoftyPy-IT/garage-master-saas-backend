import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join((process.cwd(), '.env')) });


export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.CENTRAL_DB_URI,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  cloudinary_name: process.env.CLOUDINARY_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_secret: process.env.CLOUDINARY_SECRET,
  DB_NAME: process.env.DB_NAME,
  jwt_access_secret: process.env.JWT_ACCESS_SECRETE,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRETE,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  bcrypt_salt_round: process.env.BCRYPT_SALT_ROUND,
  default_pass:process.env.default_pass,
  super_admin_password:process.env.SUPER_ADMIN_PASSWORD,
  DEFAULT_PASS:process.env.DEFAULT_PASS,


};
