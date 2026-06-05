import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";

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

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
