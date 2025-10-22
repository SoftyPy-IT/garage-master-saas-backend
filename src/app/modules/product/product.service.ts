/* eslint-disable @typescript-eslint/no-unused-vars */
import QueryBuilder from '../../builder/QueryBuilder';
import { ImageUpload } from '../../utils/ImageUpload';
import path from 'path';
import { TProduct } from './product.interface';
import { productSearch } from './product.constant';
import { getTenantModel } from '../../utils/getTenantModels';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

export const createProduct = async (
  tenantDomain: string,
  payload: any,
  file?: Express.Multer.File
) => {
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: ProductType } = await getTenantModel(tenantDomain, 'ProductType');
  const { Model: Category } = await getTenantModel(tenantDomain, 'Category');
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');
  const { Model: Brand } = await getTenantModel(tenantDomain, 'Brand');
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  try {
    //  Handle file upload
    if (file) {
      const imageName = file.filename;
      const imagePath = path.join(process.cwd(), 'uploads', file.filename);
      const folder = 'brand-images';
      const cloudinaryResult = await ImageUpload(imagePath, imageName, folder);
      payload.image = cloudinaryResult.secure_url;
    }

    if (payload.image && typeof payload.image !== 'string') {
      throw new Error('Invalid image URL format');
    }

    //  Create Product
    const newProduct = await Product.create(payload);

    //  Link product to suppliers
    if (payload.suppliers && payload.suppliers.length) {
      await Supplier.updateMany(
        { _id: { $in: payload.suppliers } },
        { $push: { products: newProduct._id } }
      );
    }

    //  Link product to other related models (optional, if needed)
    if (payload.product_type) {
      await ProductType.findByIdAndUpdate(payload.product_type, {
        $addToSet: { products: newProduct._id },
      });
    }
    if (payload.category) {
      await Category.findByIdAndUpdate(payload.category, {
        $addToSet: { products: newProduct._id },
      });
    }
    if (payload.warranties) {
      await Warranty.findByIdAndUpdate(payload.warranties, {
        $addToSet: { products: newProduct._id },
      });
    }
    if (payload.brand) {
      await Brand.findByIdAndUpdate(payload.brand, {
        $addToSet: { products: newProduct._id },
      });
    }
    if (payload.unit) {
      await Unit.findByIdAndUpdate(payload.unit, {
        $addToSet: { products: newProduct._id },
      });
    }
    if (payload.warehouse) {
      await Warehouse.findByIdAndUpdate(payload.warehouse, {
        $addToSet: { products: newProduct._id },
      });
    }

    return newProduct;
  } catch (error: any) {
    console.error('Error creating product:', error.message);
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error.message || 'An unexpected error occurred while creating the product'
    );
  }
};



const getAllProduct = async (
  tenantDomain: string,
  query: Record<string, any>,
) => {
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const categoryQuery = new QueryBuilder(Product.find(), query)
    .search(productSearch)
    // .filter()
    // .sort()
    // .paginate()
    // .fields();

  const meta = await categoryQuery.countTotal();
  const products = await categoryQuery.modelQuery.populate([
    {
      path: 'category',
      model: (await getTenantModel(tenantDomain, 'Category')).Model,
    },
    {
      path: 'brand',
      model: (await getTenantModel(tenantDomain, 'Brand')).Model,
    },
    { path: 'unit', model: (await getTenantModel(tenantDomain, 'Unit')).Model },
    {
      path: 'product_type',
      model: (await getTenantModel(tenantDomain, 'ProductType')).Model,
    },
    {
      path: 'suppliers',
      model: (await getTenantModel(tenantDomain, 'Supplier')).Model,
    },
    {
      path: 'warehouse',
      model: (await getTenantModel(tenantDomain, 'Warehouse')).Model,
    },
  ]);
  return { meta, products };
};

const getSingleProduct = async (tenantDomain: string, id: string) => {
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');

  const result = await Product.findById(id).populate([
    {
      path: 'category',
      model: (await getTenantModel(tenantDomain, 'Category')).Model,
    },
    {
      path: 'brand',
      model: (await getTenantModel(tenantDomain, 'Brand')).Model,
    },
    { path: 'unit', model: (await getTenantModel(tenantDomain, 'Unit')).Model },
    {
      path: 'product_type',
      model: (await getTenantModel(tenantDomain, 'ProductType')).Model,
    },
    {
      path: 'suppliers',
      model: (await getTenantModel(tenantDomain, 'Supplier')).Model,
    },
    {
      path: 'warehouse',
      model: (await getTenantModel(tenantDomain, 'Warehouse')).Model,
    },
    {
      path: 'warranties',
      model: (await getTenantModel(tenantDomain, 'Warranty')).Model,
    },
  ]);

  return result;
};

export const updateProduct = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TProduct>,
  file?: Express.Multer.File
) => {
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: ProductType } = await getTenantModel(tenantDomain, 'ProductType');
  const { Model: Category } = await getTenantModel(tenantDomain, 'Category');
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');
  const { Model: Brand } = await getTenantModel(tenantDomain, 'Brand');
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  try {
    // Handle file upload
    if (file) {
      const imageName = file.filename;
      const imagePath = path.join(process.cwd(), 'uploads', file.filename);
      const folder = 'brand-images';
      const cloudinaryResult = await ImageUpload(imagePath, imageName, folder);
      payload.image = cloudinaryResult.secure_url;
    }

    if (payload.image && typeof payload.image !== 'string') {
      throw new Error('Invalid image URL format');
    }

    // Find the existing product first
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
    }

    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    // Helper function to update relations
    const updateRelation = async (
      Model: any,
      newId: string | undefined,
      oldId: string | undefined
    ) => {
      if (oldId && oldId !== newId) {
        await Model.findByIdAndUpdate(oldId, { $pull: { products: id } });
      }
      if (newId) {
        await Model.findByIdAndUpdate(newId, { $addToSet: { products: id } });
      }
    };

    // Update all relations
    await updateRelation(Supplier, payload.suppliers?.toString(), existingProduct.suppliers?.toString());
    await updateRelation(ProductType, payload.product_type?.toString(), existingProduct.product_type?.toString());
    await updateRelation(Category, payload.category?.toString(), existingProduct.category?.toString());
    await updateRelation(Warranty, payload.warranties?.toString(), existingProduct.warranties?.toString());
    await updateRelation(Brand, payload.brand?.toString(), existingProduct.brand?.toString());
    await updateRelation(Unit, payload.unit?.toString(), existingProduct.unit?.toString());
    await updateRelation(Warehouse, payload.warehouse?.toString(), existingProduct.warehouse?.toString());

    return updatedProduct;
  } catch (error: any) {
    console.error('Error updating product:', error.message);
    throw new AppError(
      httpStatus.BAD_REQUEST,
      error.message || 'An unexpected error occurred while updating the product'
    );
  }
};



export const deleteProduct = async (tenantDomain: string, id: string) => {
  const { Model: Product } = await getTenantModel(tenantDomain, 'Product');
  const { Model: Supplier } = await getTenantModel(tenantDomain, 'Supplier');
  const { Model: ProductType } = await getTenantModel(tenantDomain, 'ProductType');
  const { Model: Category } = await getTenantModel(tenantDomain, 'Category');
  const { Model: Warranty } = await getTenantModel(tenantDomain, 'Warranty');
  const { Model: Brand } = await getTenantModel(tenantDomain, 'Brand');
  const { Model: Unit } = await getTenantModel(tenantDomain, 'Unit');
  const { Model: Warehouse } = await getTenantModel(tenantDomain, 'Warehouse');

  // Remove product references from related models
  const removeFromRelation = async (Model: any) => {
    await Model.updateMany({}, { $pull: { products: id } });
  };

  await Promise.all([
    removeFromRelation(Supplier),
    removeFromRelation(ProductType),
    removeFromRelation(Category),
    removeFromRelation(Warranty),
    removeFromRelation(Brand),
    removeFromRelation(Unit),
    removeFromRelation(Warehouse),
  ]);

  const result = await Product.deleteOne({ _id: id });
  return result;
};


export const productServices = {
  createProduct,
  getAllProduct,
   getSingleProduct,
  updateProduct,
  deleteProduct,
};
