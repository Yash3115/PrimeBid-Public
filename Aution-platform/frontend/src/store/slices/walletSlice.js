import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { api, getErrorMessage, toastApiError } from "@/lib/api";

const emptyWallet = {
  availableBalance: 0,
  lockedBalance: 0,
  lifetimeDeposited: 0,
  lifetimeWithdrawn: 0,
};

const emptyLockBreakdown = {
  totalLocked: 0,
  knownLockedTotal: 0,
  bidLockedTotal: 0,
  withdrawalLockedTotal: 0,
  unmatchedAmount: 0,
  bidLocks: [],
  withdrawalLocks: [],
  hasLockedFunds: false,
};

const walletSlice = createSlice({
  name: "wallet",
  initialState: {
    loading: false,
    actionLoading: false,
    wallet: emptyWallet,
    lockBreakdown: emptyLockBreakdown,
    transactions: [],
    withdrawals: [],
    bankTransfer: null,
    kycStatus: null,
  },
  reducers: {
    walletRequest(state) {
      state.loading = true;
    },
    walletSuccess(state, action) {
      state.loading = false;
      state.wallet = action.payload.wallet || emptyWallet;
      state.lockBreakdown = action.payload.lockBreakdown || emptyLockBreakdown;
      state.transactions = action.payload.transactions || [];
      state.withdrawals = action.payload.withdrawals || [];
      state.bankTransfer = action.payload.bankTransfer || null;
      state.kycStatus = action.payload.kycStatus || null;
    },
    walletFailed(state) {
      state.loading = false;
    },
    walletActionRequest(state) {
      state.actionLoading = true;
    },
    walletActionSuccess(state, action) {
      state.actionLoading = false;
      state.wallet = action.payload.wallet || state.wallet;
      state.lockBreakdown = action.payload.lockBreakdown || state.lockBreakdown;
      state.transactions = action.payload.transactions || state.transactions;
      state.withdrawals = action.payload.withdrawals || state.withdrawals;
      state.bankTransfer = action.payload.bankTransfer || state.bankTransfer;
      state.kycStatus = action.payload.kycStatus || state.kycStatus;
    },
    walletActionFailed(state) {
      state.actionLoading = false;
    },
    walletReset(state) {
      state.loading = false;
      state.actionLoading = false;
      state.wallet = emptyWallet;
      state.lockBreakdown = emptyLockBreakdown;
      state.transactions = [];
      state.withdrawals = [];
      state.bankTransfer = null;
      state.kycStatus = null;
    },
  },
});

export const fetchWallet = () => async (dispatch) => {
  dispatch(walletSlice.actions.walletRequest());
  try {
    const response = await api.get("/wallet");
    dispatch(walletSlice.actions.walletSuccess(response.data));
    return response.data;
  } catch (error) {
    dispatch(walletSlice.actions.walletFailed());
    console.error(getErrorMessage(error));
    return { success: false };
  }
};

export const topUpWallet = (data) => async (dispatch) => {
  dispatch(walletSlice.actions.walletActionRequest());
  try {
    const response = await api.post("/wallet/top-up", data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(walletSlice.actions.walletActionSuccess(response.data));
    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    dispatch(walletSlice.actions.walletActionFailed());
    toastApiError(error);
    return { success: false };
  }
};

export const requestWalletWithdrawal = (data) => async (dispatch) => {
  dispatch(walletSlice.actions.walletActionRequest());
  try {
    const response = await api.post("/wallet/withdrawals", data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(walletSlice.actions.walletActionSuccess(response.data));
    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    dispatch(walletSlice.actions.walletActionFailed());
    toastApiError(error);
    return { success: false };
  }
};

export const resetWallet = () => (dispatch) => {
  dispatch(walletSlice.actions.walletReset());
};

export default walletSlice.reducer;
