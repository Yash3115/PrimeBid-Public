import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { getAllAuctionItems } from "./auctionSlice";
import { api, getErrorMessage, toastApiError } from "@/lib/api";

const superAdminSlice = createSlice({
  name: "superAdmin",
  initialState: {
    loading: false,
    overview: null,
    monthlyRevenue: [],
    platformAccount: null,
    platformTransactions: [],
    totalAuctioneers: [],
    totalBidders: [],
    usersList: [],
    kycSubmissions: [],
    auditLogs: [],
    withdrawalRequests: [],
    fulfillmentDisputes: [],
  },
  reducers: {
    requestForMonthlyRevenue(state) {
      state.loading = true;
      state.monthlyRevenue = [];
    },
    successForMonthlyRevenue(state, action) {
      state.loading = false;
      state.monthlyRevenue = action.payload.revenue || action.payload;
      state.platformAccount = action.payload.platformAccount || null;
      state.platformTransactions = action.payload.platformTransactions || [];
    },
    failedForMonthlyRevenue(state) {
      state.loading = false;
      state.monthlyRevenue = [];
    },
    requestForAllUsers(state) {
      state.loading = true;
      state.totalAuctioneers = [];
      state.totalBidders = [];
    },
    successForAllUsers(state, action) {
      state.loading = false;
      state.totalAuctioneers = action.payload.auctioneersArray;
      state.totalBidders = action.payload.biddersArray;
    },
    failureForAllUsers(state) {
      state.loading = false;
      state.totalAuctioneers = [];
      state.totalBidders = [];
    },
    requestForAuctionItemDelete(state) {
      state.loading = true;
    },
    successForAuctionItemDelete(state) {
      state.loading = false;
    },
    failureForAuctionItemDelete(state) {
      state.loading = false;
    },
    clearAllErrors(state) {
      state.loading = false;
    },
    usersListSuccess(state, action) {
      state.usersList = action.payload;
    },
    kycSubmissionsSuccess(state, action) {
      state.kycSubmissions = action.payload;
    },
    auditLogsSuccess(state, action) {
      state.auditLogs = action.payload;
    },
    withdrawalRequestsSuccess(state, action) {
      state.withdrawalRequests = action.payload;
    },
    fulfillmentDisputesSuccess(state, action) {
      state.fulfillmentDisputes = action.payload;
    },
    adminOverviewSuccess(state, action) {
      state.overview = action.payload;
    },
  },
});

export const getAdminOverview = () => async (dispatch) => {
  try {
    const response = await api.get("/superadmin/overview");
    dispatch(superAdminSlice.actions.adminOverviewSuccess(response.data.overview));
    return response.data;
  } catch (error) {
    console.error(getErrorMessage(error));
    return { success: false };
  }
};

export const getMonthlyRevenue = () => async (dispatch) => {
  dispatch(superAdminSlice.actions.requestForMonthlyRevenue());
  try {
    const response = await api.get("/superadmin/monthlyincome");
    dispatch(
      superAdminSlice.actions.successForMonthlyRevenue(
        {
          revenue: response.data.totalMonthlyRevenue,
          platformAccount: response.data.platformAccount,
          platformTransactions: response.data.platformTransactions,
        }
      )
    );
  } catch (error) {
    dispatch(superAdminSlice.actions.failedForMonthlyRevenue());
    console.error(getErrorMessage(error));
  }
};

export const getAllUsers = () => async (dispatch) => {
  dispatch(superAdminSlice.actions.requestForAllUsers());
  try {
    const response = await api.get("/superadmin/users/getall");
    dispatch(superAdminSlice.actions.successForAllUsers(response.data));
  } catch (error) {
    dispatch(superAdminSlice.actions.failureForAllUsers());
    console.error(getErrorMessage(error));
  }
};

export const deleteAuctionItem = (id) => async (dispatch) => {
  dispatch(superAdminSlice.actions.requestForAuctionItemDelete());
  try {
    const response = await api.delete(`/superadmin/auctionitem/delete/${id}`);
    dispatch(superAdminSlice.actions.successForAuctionItemDelete());
    toast.success(response.data.message);
    dispatch(getAllAuctionItems());
  } catch (error) {
    dispatch(superAdminSlice.actions.failureForAuctionItemDelete());
    console.error(getErrorMessage(error));
    toastApiError(error);
  }
};

export const clearAllSuperAdminSliceErrors = () => (dispatch) => {
  dispatch(superAdminSlice.actions.clearAllErrors());
};

export const getUsersList = (params = {}) => async (dispatch) => {
  try {
    const response = await api.get("/superadmin/users/list", { params });
    dispatch(superAdminSlice.actions.usersListSuccess(response.data.users));
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const updateUserStatus = (id, accountStatus) => async (dispatch) => {
  try {
    const response = await api.put(
      `/superadmin/users/status/${id}`,
      { accountStatus },
      { headers: { "Content-Type": "application/json" } }
    );
    toast.success(response.data.message);
    dispatch(getUsersList());
    dispatch(getAuditLogs());
  } catch (error) {
    toastApiError(error);
  }
};

export const getKycSubmissions = (status = "Pending") => async (dispatch) => {
  try {
    const response = await api.get("/superadmin/kyc/submissions", {
      params: { status },
    });
    dispatch(superAdminSlice.actions.kycSubmissionsSuccess(response.data.users));
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const updateKycStatus =
  (id, status, rejectionReason = "", currentFilter = "Pending") =>
  async (dispatch) => {
    try {
      const response = await api.put(
        `/superadmin/kyc/${id}`,
        { status, rejectionReason },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(response.data.message);
      dispatch(getKycSubmissions(currentFilter));
      dispatch(getUsersList());
      dispatch(getAuditLogs());
      return response.data;
    } catch (error) {
      toastApiError(error);
      return { success: false };
    }
  };

export const getAuditLogs = () => async (dispatch) => {
  try {
    const response = await api.get("/superadmin/audit-logs");
    dispatch(superAdminSlice.actions.auditLogsSuccess(response.data.logs));
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const getWithdrawalRequests =
  (status = "Pending") =>
  async (dispatch) => {
    try {
      const response = await api.get("/superadmin/wallet/withdrawals", {
        params: { status },
      });
      dispatch(
        superAdminSlice.actions.withdrawalRequestsSuccess(
          response.data.withdrawals
        )
      );
    } catch (error) {
      console.error(getErrorMessage(error));
    }
  };

export const reviewWithdrawalRequest =
  (id, status, adminComment = "") =>
  async (dispatch) => {
    try {
      const response = await api.put(
        `/superadmin/wallet/withdrawals/${id}`,
        { status, adminComment },
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(response.data.message);
      dispatch(
        superAdminSlice.actions.withdrawalRequestsSuccess(
          response.data.withdrawals
        )
      );
      dispatch(getAuditLogs());
      return response.data;
    } catch (error) {
      toastApiError(error);
      return { success: false };
    }
  };

export const getFulfillmentDisputes =
  (status = "Open") =>
  async (dispatch) => {
    try {
      const response = await api.get("/superadmin/fulfillment/disputes", {
        params: { status },
      });
      dispatch(
        superAdminSlice.actions.fulfillmentDisputesSuccess(
          response.data.disputes
        )
      );
    } catch (error) {
      console.error(getErrorMessage(error));
    }
  };

export const reviewFulfillmentDispute =
  (id, data, currentFilter = "Open") =>
  async (dispatch) => {
    try {
      const response = await api.put(
        `/superadmin/fulfillment/disputes/${id}`,
        data,
        { headers: { "Content-Type": "application/json" } }
      );
      toast.success(response.data.message);
      dispatch(getFulfillmentDisputes(currentFilter));
      dispatch(getAuditLogs());
      dispatch(getAdminOverview());
      return response.data;
    } catch (error) {
      toastApiError(error);
      return { success: false };
    }
  };

export default superAdminSlice.reducer;
