import cron from "node-cron"
import { SubscriptionModel } from "../app/modules/subscription/subscription.model"

cron.schedule("0 1 * * *", async () => {

  const now = new Date()

  try {
    // Find subscriptions that have expired but are still marked as active
    const expiredSubscriptions = await SubscriptionModel.find({
      endDate: { $lt: now },
      isActive: true,
    })

    if (expiredSubscriptions.length > 0) {
      // Update expired subscriptions
      const result = await SubscriptionModel.updateMany(
        {
          endDate: { $lt: now },
          isActive: true,
        },
        {
          $set: {
            status: "Expired",
            isActive: false,
          },
        },
      )
      expiredSubscriptions.forEach((sub) => {
        
      })
    } else {
    }

    // Also check for subscriptions expiring in 3 days (for reminder)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(now.getDate() + 3)

    const expiringSubscriptions = await SubscriptionModel.find({
      endDate: { $lte: threeDaysFromNow, $gt: now },
      isActive: true,
    }).populate("user", "name email")

    if (expiringSubscriptions.length > 0) {
    
      expiringSubscriptions.forEach((sub) => {
        
      })
    }
  } catch (error) {
  }
})
