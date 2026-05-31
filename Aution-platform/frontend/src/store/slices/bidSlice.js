import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { getAuctionDetail } from "./auctionSlice";
import { api, toastApiError } from "@/lib/api";
import { fetchWallet } from "./walletSlice";

const bidSlice = createSlice({
  name: "bid",
  initialState: {
    loading: false,
  },
  reducers: {
    bidRequest(state) {
      state.loading = true;
    },
    bidSuccess(state) {
      state.loading = false;
    },
    bidFailed(state) {
      state.loading = false;
    },
    autoBidRequest(state) {
      state.loading = true;
    },
    autoBidSuccess(state) {
      state.loading = false;
    },
    autoBidFailed(state) {
      state.loading = false;
    },
  },
});

export const placeBid = (id, data) => async (dispatch) => {
  dispatch(bidSlice.actions.bidRequest());
  try {
    const response = await api.post(`/bid/place/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(bidSlice.actions.bidSuccess());
    toast.success(response.data.message);
    dispatch(getAuctionDetail(id))
    dispatch(fetchWallet());
    return response.data;
  } catch (error) {
    dispatch(bidSlice.actions.bidFailed());
    toastApiError(error);
    if (error?.response?.status === 409) {
      dispatch(getAuctionDetail(id, { silent: true }));
    }
    return { success: false };
  }
};

export const manageAutoBid = (id, data) => async (dispatch) => {
  dispatch(bidSlice.actions.autoBidRequest());
  try {
    const response = await api.put(`/bid/auto/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(bidSlice.actions.autoBidSuccess());
    toast.success(response.data.message);
    dispatch(getAuctionDetail(id));
    return response.data;
  } catch (error) {
    dispatch(bidSlice.actions.autoBidFailed());
    toastApiError(error);
    if (error?.response?.status === 409) {
      dispatch(getAuctionDetail(id, { silent: true }));
    }
    return { success: false };
  }
};

export default bidSlice.reducer
