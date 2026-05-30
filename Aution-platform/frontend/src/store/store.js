import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import auctionReducer from "./slices/auctionSlice";
import bidReducer from "./slices/bidSlice";
import superAdminReducer from "./slices/superAdminSlice";
import walletReducer from "./slices/walletSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    auction: auctionReducer,
    bid: bidReducer,
    superAdmin: superAdminReducer,
    wallet: walletReducer,
  },
});
