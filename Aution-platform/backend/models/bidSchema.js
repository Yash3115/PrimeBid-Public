import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
    amount: Number,
    bidder:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        userName: String,
        profileImage: String
    },
    auctionItem:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction',
        required: true
    },
    maxAutoBid: Number,
    lockedAmount:{
        type:Number,
        default:0
    },
    isAutoBid:{
        type:Boolean,
        default:false
    }
}, { timestamps: true })

bidSchema.index({ auctionItem: 1, "bidder.id": 1 }, { unique: true });
bidSchema.index({ auctionItem: 1, amount: -1 });

const Bid = new mongoose.model("Bid",bidSchema);
export default Bid;
