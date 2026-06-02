import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connection } from "../db/connection.js";
import User from "../models/userSchema.js";

dotenv.config();

const adminDefaults = {
    userName: process.env.ADMIN_SEED_USERNAME || "PrimeBid Admin",
    email: (process.env.ADMIN_SEED_EMAIL || "admin@primebid.local")
        .toLowerCase()
        .trim(),
    password: process.env.ADMIN_SEED_PASSWORD || "PrimeBid@123",
    phone: process.env.ADMIN_SEED_PHONE || "9000000001",
    address: process.env.ADMIN_SEED_ADDRESS || "PrimeBid admin workspace",
};

const ensureAdminUser = async () => {
    if (!adminDefaults.email || !adminDefaults.password) {
        throw new Error("ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required");
    }

    const phoneOwner = adminDefaults.phone
        ? await User.findOne({ phone: adminDefaults.phone }).select("email")
        : null;
    if (phoneOwner && phoneOwner.email !== adminDefaults.email) {
        throw new Error(
            `ADMIN_SEED_PHONE is already used by ${phoneOwner.email}. Set a different ADMIN_SEED_PHONE.`
        );
    }

    const existingAdmin = await User.findOne({ email: adminDefaults.email }).select(
        "+password"
    );
    const passwordHash = await bcrypt.hash(adminDefaults.password, 10);
    const admin = existingAdmin || new User({ email: adminDefaults.email });

    admin.userName = adminDefaults.userName;
    admin.password = passwordHash;
    admin.phone = adminDefaults.phone;
    admin.address = adminDefaults.address;
    admin.role = "Super Admin";
    admin.accountStatus = "Active";
    admin.kycStatus = "Approved";
    admin.kycRejectionReason = "";
    admin.profileImage = admin.profileImage?.url
        ? admin.profileImage
        : {
              public_id: "primebid-admin-profile",
              url: "/imageHolder.jpg",
          };
    admin.wallet = {
        availableBalance: Number(admin.wallet?.availableBalance || 0),
        lockedBalance: Number(admin.wallet?.lockedBalance || 0),
        lifetimeDeposited: Number(admin.wallet?.lifetimeDeposited || 0),
        lifetimeWithdrawn: Number(admin.wallet?.lifetimeWithdrawn || 0),
    };

    await admin.save();

    const passwordMatches = await bcrypt.compare(adminDefaults.password, admin.password);
    if (!passwordMatches) {
        throw new Error("Admin password verification failed after save");
    }

    return {
        created: !existingAdmin,
        email: admin.email,
        role: admin.role,
        accountStatus: admin.accountStatus,
        kycStatus: admin.kycStatus,
    };
};

try {
    await connection();
    const result = await ensureAdminUser();

    console.log(
        `${result.created ? "Created" : "Updated"} Super Admin: ${result.email}`
    );
    console.log(`Status: ${result.accountStatus}, KYC: ${result.kycStatus}`);
} catch (error) {
    console.error(`Admin seed failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
