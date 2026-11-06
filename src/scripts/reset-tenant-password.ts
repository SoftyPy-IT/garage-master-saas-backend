import bcrypt from "bcrypt";

import { connectToTenantDatabase } from "../server";
import { Tenant } from "../app/modules/tenant/tenant.model";
import { userSchema } from "../app/modules/user/user.model";

// Adjust import paths to match your project.

async function resetPassword() {
    const tenantDomain = "garage.worldautosolution.com";
    const username = "World Autosolution";

    // Read the new password securely from your environment.
    const newPassword = process.env.RESET_PASSWORD;

    if (!newPassword || newPassword.length < 12) {
        throw new Error("Set a strong password of at least 12 characters.");
    }

    const tenant = await Tenant.findOne({ domain: tenantDomain });

    if (!tenant) {
        throw new Error("Tenant not found.");
    }

    const tenantConn = await connectToTenantDatabase(
        tenant._id.toString(),
        tenant.dbUri,
    );

    const TenantUser =
        tenantConn.models.User ||
        tenantConn.model("User", userSchema);

    const user = await TenantUser.findOne({ name: username });

    if (!user) {
        throw new Error("User not found in tenant database.");
    }

    // Your pre-save hook hashes this password automatically.
    user.password = newPassword;
    user.passwordChangeAt = new Date();

    await user.save();

    console.log("Password reset successful.");
    await tenantConn.close();
}

resetPassword().catch((error) => {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
});