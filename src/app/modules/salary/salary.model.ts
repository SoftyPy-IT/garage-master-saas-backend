import mongoose, { Schema, type Model } from "mongoose";
import type { TPaymentHistory, TSalaryDocument, TSalaryMethods } from "./salary.interface";

const paymentHistorySchema: Schema<TPaymentHistory> = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0, "Payment amount cannot be negative"],
    },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String },
    payment_method: {
      type: String,
      enum: ["cash", "bank_transfer", "check", "other"],
      required: true,
      default: "cash",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false },
);

export const salarySchema: Schema<TSalaryDocument, Model<TSalaryDocument, {}, {}, TSalaryMethods>, {}, TSalaryMethods> = new Schema<TSalaryDocument, Model<TSalaryDocument, {}, {}, TSalaryMethods>, {}, TSalaryMethods>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      required: [true, "Employee is required."],
      ref: "Employee",
    },
    employeeId: { type: String, required: true },
    full_name: { type: String, required: true },
    month_of_salary: { type: String, required: true },
    year_of_salary: { type: String, required: true },

    // Salary components
    bonus: { type: Number, default: 0, min: 0 },
    total_overtime: { type: Number, default: 0, min: 0 },
    overtime_rate: { type: Number, default: 0, min: 0 }, // Add this field
    overtime_amount: { type: Number, default: 0, min: 0 },
    salary_amount: { type: Number, default: 0, min: 0 },
    previous_due: { type: Number, default: 0, min: 0 },
    cut_salary: { type: Number, default: 0, min: 0 },
    total_payment: { type: Number, required: true, min: 0 },

    // Legacy fields (kept for backward compatibility)
    advance: { type: Number, default: 0, min: 0 },
    pay: { type: Number, default: 0, min: 0 },
    due: { type: Number, default: 0, min: 0 },
    paid: { type: Number, default: 0, min: 0 },

    // Current payment tracking fields
    paid_amount: { type: Number, default: 0, min: 0 },
    due_amount: { type: Number, default: 0, min: 0 },
    payment_status: {
      type: String,
      enum: ["pending", "partial", "completed"],
      default: "pending",
    },
    payment_history: [paymentHistorySchema],
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
salarySchema.index({ employee: 1, month_of_salary: 1, year_of_salary: 1 }, { unique: true });
salarySchema.index({ payment_status: 1 });
salarySchema.index({ month_of_salary: 1, year_of_salary: 1 });

// Method to calculate total payment from salary components
salarySchema.methods.calculateTotalPayment = function (this: TSalaryDocument): number {
  const bonus = Number(this.bonus) || 0;
  const overtimeAmount = Number(this.overtime_amount) || 0;
  const salaryAmount = Number(this.salary_amount) || 0;
  const previousDue = Number(this.previous_due) || 0;
  const cutSalary = Number(this.cut_salary) || 0;

  return Math.max(0, bonus + overtimeAmount + salaryAmount + previousDue - cutSalary);
};

// Method to recalculate payment amounts
salarySchema.methods.recalculatePayments = function (this: TSalaryDocument) {
  // Calculate overtime amount if rate and hours are available
  if (this.total_overtime && this.overtime_rate) {
    this.overtime_amount = this.total_overtime * this.overtime_rate;
  }

  // Ensure total_payment is up to date
  this.total_payment = this.calculateTotalPayment();

  // Calculate total paid from payment_history
  const paymentHistory = this.payment_history || [];
  const totalPaidFromHistory = paymentHistory.reduce((sum, payment) => {
    const amount = Number(payment.amount) || 0;
    return sum + amount
  }, 0);

  // Add legacy payments (advance + pay) if they exist and no payment history
  let totalPaidAmount = totalPaidFromHistory;
  if (paymentHistory.length === 0) {
    const legacyAdvance = Number(this.advance) || 0;
    const legacyPay = Number(this.pay) || 0;
    totalPaidAmount = legacyAdvance + legacyPay;
  }

  this.paid_amount = totalPaidAmount;

  // Calculate due_amount
  const expectedTotal = this.total_payment;
  this.due_amount = Math.max(0, expectedTotal - totalPaidAmount);
  
  // Update payment_status
  if (totalPaidAmount === 0) {
    this.payment_status = "pending";
  } else if (totalPaidAmount >= expectedTotal) {
    this.payment_status = "completed";
    this.due_amount = 0; // Ensure no negative due amount
  } else {
    this.payment_status = "partial";
  }

  // Update legacy fields for backward compatibility
  this.paid = totalPaidAmount;
  this.due = this.due_amount;

  return this;
};

// Method to validate payment amounts
salarySchema.methods.validatePaymentAmounts = function (this: TSalaryDocument): boolean {
  const totalPayment = this.total_payment || 0;
  const paidAmount = this.paid_amount || 0;
  const dueAmount = this.due_amount || 0;

  // Check if paid + due equals total
  const calculatedTotal = paidAmount + dueAmount;
  const isValid = Math.abs(calculatedTotal - totalPayment) < 0.01; // Allow for floating point precision

  if (!isValid) {
    console.error("❌ Payment validation failed:", {
      totalPayment,
      paidAmount,
      dueAmount,
      calculatedTotal,
      difference: calculatedTotal - totalPayment,
    });
  }

  return isValid;
};

// Pre-save middleware to auto-calculate payment amounts
salarySchema.pre("save", function (next) {
  try {
    // Always recalculate if it's a new document
    if (this.isNew) {
      this.recalculatePayments();
      return next();
    }

    // Check if salary components have been modified
    const salaryComponentsModified = [
      "bonus",
      "total_overtime",
      "overtime_rate",
      "overtime_amount",
      "salary_amount",
      "previous_due",
      "cut_salary",
      "total_payment",
    ].some((field) => this.isModified(field));

    // Check if payment fields have been modified
    const paymentFieldsModified = ["payment_history", "advance", "pay", "paid_amount", "due_amount"].some((field) =>
      this.isModified(field),
    );

    // Recalculate if any relevant fields have been modified
    if (salaryComponentsModified || paymentFieldsModified) {
      this.recalculatePayments();
    }

    // Validate the calculations
    if (!this.validatePaymentAmounts()) {
      console.warn("⚠️ Payment validation failed, but continuing...");
    }

    next();
  } catch (error) {
    console.error("❌ Error in pre-save middleware:", error);
    // next(error:any)
  }
});

// Post-save middleware for logging
salarySchema.post("save", (doc) => {
  // Logging logic if needed
});

export const Salary = mongoose.model<TSalaryDocument>("Salary", salarySchema);