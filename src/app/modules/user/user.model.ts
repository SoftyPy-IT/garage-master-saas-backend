import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { TUser, UserModel } from './user.interface';
import config from '../../config';

export const userSchema = new Schema<TUser>(
  {
    name: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    tenantDomain: {
      type: String,
    },
    image: {
      type: String,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
    },
    tenantInfo: {
      name: String,
      domain: String,
      businessType: String,
      dbUri: String,
      isActive: Boolean,
      subscription: {
        plan: String,
        startDate: Date,
        endDate: Date,
        status: String,
        isPaid: Boolean,
        isActive: Boolean,
        paymentMethod: String,
        amount: Number,
      },
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    role: {
      type: String,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordChangeAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function (next) {
  const user = this;
  user.password = await bcrypt.hash(user.password, Number(config.default_pass));
  next();
});

userSchema.post('save', function (doc, next) {
  doc.password = '';
  next();
});

userSchema.statics.isUserExistsByCustomId = async function (name: string) {
  return await this.findOne({ name }).select('+password');
};

userSchema.statics.isPasswordMatched = async function (
  plaingTextPassword: string,
  hashedPassword: string,
) {
  return await bcrypt.compare(plaingTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number,
) {
  const passwordChangedTime = new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const User = model<TUser, UserModel>('User', userSchema);
