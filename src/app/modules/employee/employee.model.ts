import mongoose, { Schema } from 'mongoose';
import { TEmployee } from './employee.interface';
import config from '../../config';
import bcrypt from 'bcrypt';

export const employeeSchema: Schema<TEmployee> = new Schema<TEmployee>(
  {
    attendance: [
      {
        type: Schema.ObjectId,
        ref: 'Attendance',
      },
    ],
    salary: [
      {
        type: Schema.ObjectId,
        ref: 'Salary',
      },
    ],
    leave: [
      {
        type: Schema.ObjectId,
        ref: 'LeaveRequest',
      },
    ],
    employeeId: {
      type: String,
    },
    full_name: {
      type: String,
    },
    date_of_birth: {
      type: String,
    },
    nid_number: {
      type: Number,
    },
    blood_group: {
      type: String,
    },
    country_code: {
      type: String,
    },
    phone_number: {
      type: String,
    },
    full_phone_number: {
      type: String,
    },
    email: {
      type: String,
    },
    gender: {
      type: String,
    },
    join_date: {
      type: String,
    },

    designation: {
      type: String,
    },
    status: {
      type: String,
    },
    password: {
      type: String,
    },

    father_name: {
      type: String,
    },
    mother_name: {
      type: String,
    },
    guardian_name: {
      type: String,
    },
    guardian_country_code: {
      type: String,
    },
    guardian_contact: {
      type: String,
    },
    guardian_full_contact: {
      type: String,
    },
    relationship: {
      type: String,
    },
    nationality: {
      type: String,
    },
    religion: {
      type: String,
    },
    country: {
      type: String,
    },
    city: {
      type: String,
    },
    present_address: {
      type: String,
    },
    permanent_address: {
      type: String,
    },

    image: {
      type: String,
    },
    isRecycled: { type: Boolean, default: false },
    recycledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

employeeSchema.pre('save', function (next) {
  // if (!this.password && !this.confirm_password) {
  //   return next(new Error('Please enter both password and confirm password'));
  // }
  // if (this.password !== this.confirm_password) {
  //   return next(new Error('Passwords do not match'));
  // }

  if (!this.isModified('password')) {
    return next();
  }

  bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
    (err: Error | undefined, hash: string) => {
      if (err) {
        return next(err);
      }
      this.password = hash;
      // this.confirm_password = '';
      next();
    },
  );
});

employeeSchema.methods.comparePassword = function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Pre-save middleware to concatenate country_code and phone_number
employeeSchema.pre('save', function (next) {
  if (this.country_code && this.phone_number) {
    this.full_phone_number = `${this.country_code}${this.phone_number}`;
  } else {
    this.full_phone_number = '';
  }
  next();
});
employeeSchema.pre('save', function (next) {
  if (this.guardian_country_code && this.guardian_contact) {
    this.guardian_full_contact = `${this.guardian_country_code}${this.guardian_contact}`;
  } else {
    this.guardian_full_contact = '';
  }
  next();
});

// Pre-update middleware
employeeSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Partial<
    TEmployee & { $set: Partial<TEmployee> }
  >;

  if (update) {
    if (update.$set) {
      const { country_code, phone_number } = update.$set;

      if (country_code && phone_number) {
        update.$set.full_phone_number = `${country_code}${phone_number}`;
      }
    } else if (update.country_code && update.phone_number) {
      update.full_phone_number = `${update.country_code}${update.phone_number}`;
    }
  }

  next();
});
employeeSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as Partial<
    TEmployee & { $set: Partial<TEmployee> }
  >;

  if (update) {
    if (update.$set) {
      const { guardian_country_code, guardian_contact } = update.$set;

      if (guardian_country_code && guardian_contact) {
        update.$set.guardian_full_contact = `${guardian_country_code}${guardian_contact}`;
      }
    } else if (update.guardian_country_code && update.guardian_contact) {
      update.guardian_full_contact = `${update.guardian_country_code}${update.guardian_contact}`;
    }
  }

  next();
});

// employeeSchema.set('toJSON', {
//   transform: function (_doc, ret) {
//     delete ret.password;
//     delete ret.confirm_password;
//     return ret;
//   },
// });
export const Employee = mongoose.model<TEmployee>('Employee', employeeSchema);
