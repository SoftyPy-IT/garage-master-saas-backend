import { z } from 'zod';

const employeeValidationSchema = z.object({
  body: z.object({
    full_name: z.string({ required_error: 'Full name is required.' }),
    date_of_birth: z.string({ required_error: 'Birth date is required.' }),
    phone_number: z.string({
      required_error: 'Phone number is required.',
    }),
    email: z.string(),
    nid_number: z.number().optional(),
    gender: z.string({ required_error: 'Gender is required.' }),
    join_date: z.string({ required_error: 'Join date is required.' }),
    designation: z.string().optional(),
    status: z.string().optional(),
    father_name: z.string().optional(),
    mother_name: z.string().optional(),
    guardian_name: z.string().optional(),
    guardian_contact: z.string().optional(),
    relationship: z.string().optional(),
    nationality: z.string().optional(),
    religion: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),

    present_address: z.string().optional(),
    permanent_address: z.string().optional(),
  }),
});

export const employeeValidation = {
  employeeValidationSchema,
};
