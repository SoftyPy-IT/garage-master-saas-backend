import { NextFunction, Request, Response } from 'express';
import { DonationServices } from './donation.service';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';

const createDonation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
     const tenantDomain = req.query.tenantDomain as string
    const result = await DonationServices.createDonation(tenantDomain, req.body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Donation is create succesfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const getAllDonation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
     const tenantDomain = req.query.tenantDomain as string
    const result = await DonationServices.getAllDonation(tenantDomain);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Donation is retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getSingleDonation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
     const tenantDomain = req.query.tenantDomain as string
    const { id } = req.params;
    const result = await DonationServices.getSingleDonation(tenantDomain ,id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Single Donation is retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const deleteDonation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
     const tenantDomain = req.query.tenantDomain as string
    const result = await DonationServices.deleteDonation(tenantDomain , id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Donation is delete successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
const updateDonation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
     const tenantDomain = req.query.tenantDomain as string
    const result = await DonationServices.updateDonation(tenantDomain, id, req.body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Donation update successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const DonationController = {
  createDonation,
  getAllDonation,
  getSingleDonation,
  deleteDonation,
  updateDonation,
};
