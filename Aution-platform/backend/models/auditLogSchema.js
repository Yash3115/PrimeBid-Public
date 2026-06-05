import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";
import { createScopedModel } from "./plugins/createScopedModel.js";

const auditLogSchema = new mongoose.Schema(
    {
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        action: {
            type: String,
            required: true,
        },
        targetType: {
            type: String,
            required: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
        },
        summary: String,
    },
    { timestamps: true }
);

auditLogSchema.plugin(demoScopedModel);

const AuditLog = createScopedModel("AuditLog", auditLogSchema);

export default AuditLog;
