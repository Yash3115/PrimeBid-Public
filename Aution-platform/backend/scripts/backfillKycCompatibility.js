import dotenv from "dotenv";
import mongoose from "mongoose";
import { connection } from "../db/connection.js";
import User from "../models/userSchema.js";
import { backfillKycCompatibility } from "../utils/kycCompatibility.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");

try {
    await connection();
    const results = await backfillKycCompatibility(User, { dryRun });

    console.log(`KYC compatibility update ${dryRun ? "dry run" : "completed"}.`);
    for (const result of results) {
        console.log(
            `- ${result.name}: matched ${result.matched}, modified ${result.modified}`
        );
    }
} catch (error) {
    console.error(`KYC compatibility update failed: ${error.message}`);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
