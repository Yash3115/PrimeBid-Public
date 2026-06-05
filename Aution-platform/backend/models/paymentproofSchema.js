import mongoose from "mongoose";
import { demoScopedModel } from "./plugins/demoScopedModel.js";

const paymentproofSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    proof:{
        public_id:{
            type: String,
            required: true
        },
        url:{
            type: String,
            required: true
        }
    },
    uploadedAt:{
        type: Date,
        default: Date.now
    },
    status:{
        type: String,
        enum: ['Pending','Approved','Rejected','Settling','Settled'],
        default: 'Pending'
    },
    amount: Number,
    comment: String
}, { timestamps: true })

paymentproofSchema.plugin(demoScopedModel);

paymentproofSchema.index({ status: 1, createdAt: 1 });
paymentproofSchema.index({ userId: 1, status: 1 });

const Paymentproof = mongoose.model("Paymentproof",paymentproofSchema);
export default Paymentproof;
