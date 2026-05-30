import mongoose from 'mongoose';

const auctionschema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    startTime:{
        type: Date,

    },
    endTime:{
        type: Date,
    },
    category: String,
    description: String, 
    currentBid:{
        type: Number,
        default: 0,
    },
    minimumBidIncrement:{
        type: Number,
        default: 100,
    },
    antiSnipingExtensionMinutes:{
        type: Number,
        default: 2,
    },
    status:{
        type: String,
        enum: ["Draft", "Published"],
        default: "Published",
    },
    qualityScore:{
        type: Number,
        default: 0,
    },
    priceSuggestion:{
        low: Number,
        recommended: Number,
        high: Number,
        note: String,
    },
    condition:{
        type:String,
        enum: ['New','Used']
    },
    image:{
        public_id:{
            type: String,
            // required: true
        },
        url:{
            type: String,
            // required: true
        }
    },
    startingBid:{
        type: Number,
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    bids:[
        {
            userId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User"
            },
            userName:String,
            profileImage:String,
            amount: Number,
            lockedAmount:{
                type:Number,
                default:0
            },
            isAutoBid:{
                type:Boolean,
                default:false
            }
        },
    ],
    autoBids:[
        {
            userId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User"
            },
            userName:String,
            profileImage:String,
            maxAmount:Number
        }
    ],
    highestBidder:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    commissionCalculated:{
        type: Boolean,
        default: false
    },
}, { timestamps: true })

auctionschema.index({ status: 1, startTime: 1, endTime: 1 });
auctionschema.index({ createdBy: 1, status: 1, endTime: -1 });
auctionschema.index({ category: 1, endTime: 1 });
auctionschema.index({ highestBidder: 1, endTime: -1 });

const Auction = new mongoose.model("Auction",auctionschema);
export default Auction;
