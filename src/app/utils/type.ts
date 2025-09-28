import z from 'zod'
export const stringOrArrayOrNumber = z
  .union([z.string(), z.array(z.string()), z.number()])
  .optional()
  .nullable()
  .refine(
    (val) => {
      return (
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0) ||
        typeof val === 'string' ||
        typeof val === 'number' ||
        (Array.isArray(val) && val.every((item) => typeof item === 'string'))
      );
    },
    {
      message: 'Invalid input type.',
    },
  );