import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { api, getErrorMessage, toastApiError } from "@/lib/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authToken";
import { resetWallet } from "./walletSlice";

const userSlice = createSlice({
  name: "user",
  initialState: {
    loading: false,
    authChecked: false,
    isAuthenticated: false,
    authenticatedAt: null,
    user: {},
    leaderboard: [],
    watchlist: [],
    watchlistLoading: false,
    wonAuctions: [],
    notifications: [],
    unreadNotifications: 0,
  },
  reducers: {
    registerRequest(state) {
      state.loading = true;
      state.isAuthenticated = false;
      state.user = {};
    },
    registerSuccess(state, action) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = true;
      state.authenticatedAt = action.payload.authenticatedAt;
      state.user = action.payload.user;
    },
    registerFailed(state) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = false;
      state.authenticatedAt = null;
      state.user = {};
    },
    loginRequest(state) {
      state.loading = true;
      state.isAuthenticated = false;
      state.user = {};
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = true;
      state.authenticatedAt = action.payload.authenticatedAt;
      state.user = action.payload.user;
    },
    loginFailed(state) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = false;
      state.authenticatedAt = null;
      state.user = {};
    },
    fetchUserRequest(state) {
      state.loading = true;
      state.authChecked = false;
    },
    fetchUserSuccess(state, action) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = true;
      state.authenticatedAt = action.payload.authenticatedAt;
      state.user = action.payload.user;
    },
    fetchUserFailed(state) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = false;
      state.authenticatedAt = null;
      state.user = {};
    },

    logoutSuccess(state) {
      state.loading = false;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.authenticatedAt = null;
      state.user = {};
      state.watchlist = [];
      state.watchlistLoading = false;
      state.wonAuctions = [];
      state.notifications = [];
      state.unreadNotifications = 0;
    },
    sessionExpired(state) {
      state.loading = false;
      state.authChecked = true;
      state.isAuthenticated = false;
      state.authenticatedAt = null;
      state.user = {};
      state.watchlist = [];
      state.watchlistLoading = false;
      state.wonAuctions = [];
      state.notifications = [];
      state.unreadNotifications = 0;
    },
    logoutFailed(state) {
      state.loading = false;
    },
    fetchLeaderboardRequest(state) {
      state.loading = true;
      state.leaderboard = [];
    },
    fetchLeaderboardSuccess(state, action) {
      state.loading = false;
      state.leaderboard = action.payload;
    },
    fetchLeaderboardFailed(state) {
      state.loading = false;
      state.leaderboard = [];
    },
    watchlistRequest(state) {
      state.watchlistLoading = true;
    },
    watchlistSuccess(state, action) {
      state.watchlistLoading = false;
      state.watchlist = action.payload;
    },
    watchlistFailed(state) {
      state.watchlistLoading = false;
    },
    wonAuctionsSuccess(state, action) {
      state.wonAuctions = action.payload;
    },
    wonAuctionFulfillmentSuccess(state, action) {
      const fulfillment = action.payload;
      const auction = fulfillment?.auction;
      const auctionId = typeof auction === "object" ? auction?._id : auction;
      const item = state.wonAuctions.find((auctionItem) => auctionItem._id === auctionId);
      if (item) {
        item.fulfillment = fulfillment;
      }
    },
    notificationsSuccess(state, action) {
      state.notifications = action.payload.notifications;
      state.unreadNotifications = action.payload.unreadCount;
    },
    kycSubmitSuccess(state, action) {
      state.user = action.payload;
    },
    clearAllErrors(state) {
      state.loading = false;
    },
  },
});

export const register = (data) => async (dispatch) => {
  dispatch(userSlice.actions.registerRequest());
  try {
    const response = await api.post(
      "/user/register",
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    setAuthToken(response.data.token);
    dispatch(
      userSlice.actions.registerSuccess({
        ...response.data,
        authenticatedAt: Date.now(),
      })
    );
    toast.success(response.data.message);
    dispatch(userSlice.actions.clearAllErrors());
    return response.data;
  } catch (error) {
    dispatch(userSlice.actions.registerFailed());
    toastApiError(error);
    dispatch(userSlice.actions.clearAllErrors());
    return { success: false };
  }
};

export const login = (data) => async (dispatch) => {
  dispatch(userSlice.actions.loginRequest());
  try {
    const response = await api.post(
      "/user/login",
      data,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    setAuthToken(response.data.token);
    dispatch(
      userSlice.actions.loginSuccess({
        ...response.data,
        authenticatedAt: Date.now(),
      })
    );
    toast.success(response.data.message);
    dispatch(userSlice.actions.clearAllErrors());
    return response.data;
  } catch (error) {
    dispatch(userSlice.actions.loginFailed());
    toastApiError(error);
    dispatch(userSlice.actions.clearAllErrors());
    return { success: false };
  }
};

export const googleLogin = (data) => async (dispatch) => {
  dispatch(userSlice.actions.loginRequest());
  try {
    const response = await api.post("/user/google-login", data, {
      headers: { "Content-Type": "application/json" },
    });
    setAuthToken(response.data.token);
    dispatch(
      userSlice.actions.loginSuccess({
        ...response.data,
        authenticatedAt: Date.now(),
      })
    );
    toast.success(response.data.message);
    dispatch(userSlice.actions.clearAllErrors());
    return response.data;
  } catch (error) {
    dispatch(userSlice.actions.loginFailed());
    toastApiError(error);
    dispatch(userSlice.actions.clearAllErrors());
    return { success: false };
  }
};

export const logout = () => async (dispatch) => {
  try {
    const response = await api.get("/user/logout");
    clearAuthToken();
    dispatch(userSlice.actions.logoutSuccess());
    dispatch(resetWallet());
    toast.success(response.data.message);
    dispatch(userSlice.actions.clearAllErrors());
    return response.data;
  } catch (error) {
    dispatch(userSlice.actions.logoutFailed());
    toastApiError(error);
    dispatch(userSlice.actions.clearAllErrors());
    return { success: false };
  }
};

export const fetchUser = () => async (dispatch, getState) => {
  if (!getAuthToken()) {
    dispatch(userSlice.actions.fetchUserFailed());
    return;
  }

  dispatch(userSlice.actions.fetchUserRequest());
  try {
    const response = await api.get("/user/me");
    dispatch(
      userSlice.actions.fetchUserSuccess({
        user: response.data.user,
        authenticatedAt: Date.now(),
      })
    );
    dispatch(userSlice.actions.clearAllErrors());
  } catch (error) {
    const requestStartedAt = error.config?.metadata?.requestStartedAt;
    const authenticatedAt = getState().user.authenticatedAt;
    const status = error?.response?.status;

    if (
      error.isAuthSessionError &&
      authenticatedAt &&
      requestStartedAt &&
      requestStartedAt < authenticatedAt
    ) {
      return;
    }

    dispatch(userSlice.actions.fetchUserFailed());
    dispatch(userSlice.actions.clearAllErrors());
    if (status === 401) {
      return;
    }
    console.error(error);
  }
};

export const fetchLeaderboard = () => async (dispatch) => {
  dispatch(userSlice.actions.fetchLeaderboardRequest());
  try {
    const response = await api.get("/user/leaderboard");
    dispatch(
      userSlice.actions.fetchLeaderboardSuccess(response.data.leaderboard)
    );
    dispatch(userSlice.actions.clearAllErrors());
  } catch (error) {
    dispatch(userSlice.actions.fetchLeaderboardFailed());
    dispatch(userSlice.actions.clearAllErrors());
    console.error(error);
  }
};

export const fetchWatchlist = () => async (dispatch) => {
  dispatch(userSlice.actions.watchlistRequest());
  try {
    const response = await api.get("/user/watchlist");
    dispatch(userSlice.actions.watchlistSuccess(response.data.watchlist));
  } catch (error) {
    dispatch(userSlice.actions.watchlistFailed());
    console.error(getErrorMessage(error));
  }
};

export const addToWatchlist = (id) => async (dispatch) => {
  dispatch(userSlice.actions.watchlistRequest());
  try {
    const response = await api.post(`/user/watchlist/${id}`);
    dispatch(userSlice.actions.watchlistSuccess(response.data.watchlist));
    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    dispatch(userSlice.actions.watchlistFailed());
    toastApiError(error);
    return { success: false };
  }
};

export const removeFromWatchlist = (id) => async (dispatch) => {
  dispatch(userSlice.actions.watchlistRequest());
  try {
    const response = await api.delete(`/user/watchlist/${id}`);
    dispatch(userSlice.actions.watchlistSuccess(response.data.watchlist));
    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    dispatch(userSlice.actions.watchlistFailed());
    toastApiError(error);
    return { success: false };
  }
};

export const fetchWonAuctions = () => async (dispatch) => {
  try {
    const response = await api.get("/user/won-auctions");
    dispatch(userSlice.actions.wonAuctionsSuccess(response.data.items));
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const submitDeliveryAddress = (id, data) => async (dispatch) => {
  try {
    const response = await api.put(`/user/won-auctions/${id}/delivery`, data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(
      userSlice.actions.wonAuctionFulfillmentSuccess(
        response.data.fulfillment
      )
    );
    toast.success(response.data.message);
    dispatch(fetchNotifications());
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const reportFulfillmentIssue = (id, data) => async (dispatch) => {
  try {
    const response = await api.post(`/user/won-auctions/${id}/issue`, data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(
      userSlice.actions.wonAuctionFulfillmentSuccess(
        response.data.fulfillment
      )
    );
    toast.success(response.data.message);
    dispatch(fetchNotifications());
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const confirmFulfillmentDelivery = (id) => async (dispatch) => {
  try {
    const response = await api.put(`/user/won-auctions/${id}/confirm-delivery`);
    dispatch(
      userSlice.actions.wonAuctionFulfillmentSuccess(
        response.data.fulfillment
      )
    );
    toast.success(response.data.message);
    dispatch(fetchNotifications());
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const fetchNotifications = () => async (dispatch) => {
  try {
    const response = await api.get("/user/notifications");
    dispatch(
      userSlice.actions.notificationsSuccess({
        notifications: response.data.notifications,
        unreadCount: response.data.unreadCount,
      })
    );
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const markNotificationsRead = () => async (dispatch) => {
  try {
    await api.put("/user/notifications/read");
    dispatch(fetchNotifications());
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const submitKyc = (data) => async (dispatch) => {
  try {
    const response = await api.post("/user/kyc", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(userSlice.actions.kycSubmitSuccess(response.data.user));
    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const { sessionExpired } = userSlice.actions;

export default userSlice.reducer;
