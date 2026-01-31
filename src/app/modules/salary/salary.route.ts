import express from "express"
import { salaryController } from "./salary.controller"

const router = express.Router()


router.route("/").post(salaryController.createSalary).get(salaryController.getSalariesForCurrentMonth)
router.get('/all', salaryController.getAllSalaries);

router.route("/single/:id").get(salaryController.getSingleSalary)
router.route("/all-salary").get(salaryController.getSingleSalary)
router.route("/:id").patch(salaryController.updateSalaryIntoDB)
router.route("/:id").delete(salaryController.deleteSalaryFromDB)


router.route("/payment-status").get(salaryController.getSalariesWithPaymentStatus)
router.route("/:id/history").get(salaryController.getPaymentHistory)
router.route("/:id/payment").post(salaryController.addPartialPayment)
router.route("/statistics").get(salaryController.getSalaryStatistics)
router.route("/salary-month").get(salaryController.getSalariesByMonth)

export const SalaryRoutes = router
