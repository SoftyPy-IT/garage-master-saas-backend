import type { Types, Document } from "mongoose"

export interface TPaymentHistory {
  amount: number
  date: Date
  note?: string
  payment_method: "cash" | "bank_transfer" | "check" | "other"
  created_by?: Types.ObjectId
}

export interface TSalary {
  employee: Types.ObjectId
  employeeId: string
  full_name: string
  month_of_salary: string
  year_of_salary: string

  // Salary components
  bonus: number
  total_overtime: number
  overtime_amount: number
  overtime_rate: number
  salary_amount: number
  previous_due: number
  cut_salary: number
  total_payment: number

  // Legacy fields (kept for backward compatibility)
  advance?: number
  pay?: number
  due?: number
  paid?: number

  // Current payment tracking fields
  paid_amount: number
  due_amount: number
  payment_history: TPaymentHistory[]
  payment_status: "pending" | "partial" | "completed"
}

// Define the methods interface
export interface TSalaryMethods {
  recalculatePayments(): this
  calculateTotalPayment(): number
  validatePaymentAmounts(): boolean
}

// Define the document type with methods
export interface TSalaryDocument extends TSalary, TSalaryMethods, Document {}

export interface TSalaryFilters {
  searchTerm?: string
  month?: string
  year?: string
  payment_status?: "completed" | "pending" | "partial"
  page?: number
  limit?: number
}

export interface TPartialPayment {
  salaryId: string
  amount: number
  note?: string
  payment_method?: "cash" | "bank_transfer" | "check" | "other"
  created_by?: Types.ObjectId
}
