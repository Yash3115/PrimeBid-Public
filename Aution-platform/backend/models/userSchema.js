import mongoose from 'mongoose';
import { demoScopedModel } from "./plugins/demoScopedModel.js";

const userSchema = new mongoose.Schema({
    userName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        lowercase: true,
        trim: true,
        unique: true,
    },
    googleId:{
        type:String,
    },
    password:{
        type:String,
        required:true,
        select:false
    },
    address: String,
    phone:{
        type:String,
        trim: true,
        minLength: [10,'Phone Number must contain exact 10 digits'],
        maxLength: [10,'Phone Number must contain exact 10 digits']
    },
    profileImage:{
        public_id:{
            type:String,
            // required:true
        },
        url:{
            type:String,
            // required:true
        }
    },
    paymentMethods:{
        bankTransfer:{
            bankAccountNumber: String,
            bankAccountName: String,
            bankIFSCCode: String,
            bankName: String
        }
    },
    role:{
        type: String,
        enum: ["Auctioneer","Bidder","Super Admin"],
    },
    accountStatus:{
        type: String,
        enum: ["Active", "Paused"],
        default: "Active",
    },
    kycStatus:{
        type: String,
        enum: ["Not Submitted", "Pending", "Approved", "Rejected"],
        default() {
            return this.role === "Auctioneer" ? "Not Submitted" : "Approved";
        },
    },
    kycDocuments:{
        idProof:{
            public_id: {
                type: String,
                select: false,
            },
            url: {
                type: String,
                select: false,
            },
        },
        selfie:{
            public_id: {
                type: String,
                select: false,
            },
            url: {
                type: String,
                select: false,
            },
        },
        addressProof:{
            public_id: {
                type: String,
                select: false,
            },
            url: {
                type: String,
                select: false,
            },
        },
    },
    kycRejectionReason:{
        type: String,
        default: "",
    },
    kycSubmittedAt: Date,
    kycReviewedAt: Date,
    kycReviewedBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    reputation:{
        ratingAverage:{
            type: Number,
            default: 0,
        },
        ratingCount:{
            type: Number,
            default: 0,
        },
    },
    wallet:{
        availableBalance:{
            type: Number,
            default: 0,
            min: 0,
        },
        lockedBalance:{
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeDeposited:{
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeWithdrawn:{
            type: Number,
            default: 0,
            min: 0,
        },
    },
    buyerStats:{
        completedPurchases:{
            type: Number,
            default: 0,
        },
        defaults:{
            type: Number,
            default: 0,
        },
        disputesLost:{
            type: Number,
            default: 0,
        },
    },
    unpaidCommission:{
        type: Number,
        default: 0,
    },
    moneySpent:{
        type: Number,
        default: 0
    },
    auctionsWon:{
        type: Number,
        default: 0
    },
    watchlist:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auction"
        }
    ],
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            delete ret.password;
            return ret;
        }
    },
    toObject: {
        transform(doc, ret) {
            delete ret.password;
            return ret;
        }
    }
})

userSchema.plugin(demoScopedModel);

userSchema.index({ role: 1, accountStatus: 1 });
userSchema.index({ role: 1, kycStatus: 1, createdAt: -1 });
userSchema.index({ userName: "text", email: "text" });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index(
    { "paymentMethods.bankTransfer.bankAccountNumber": 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: {
            "paymentMethods.bankTransfer.bankAccountNumber": {
                $type: "string"
            }
        }
    }
);

const User = mongoose.model("User",userSchema);

export default User;
