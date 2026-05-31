import { createSlice } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { api, getErrorMessage, toastApiError } from "@/lib/api";

const auctionSlice = createSlice({
  name: "auction",
  initialState: {
    loading: false,
    itemDetail: {},
    auctionDetail: {},
    auctionBidders: {},
    myAutoBid: { active: false, maxAmount: null },
    myAuctions: [],
    allAuctions: [],
    auctionPagination: {
      page: 1,
      limit: 24,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    auctionFacets: {
      statusCounts: { All: 0, Live: 0, Upcoming: 0, Ended: 0 },
      categories: [],
      conditions: [],
    },
    auctionQuery: {},
    auctionListError: null,
    serverTime: null,
    serverTimeReceivedAt: null,
    sellerDashboard: null,
    smartRecommendations: [],
    listingAssistantLoading: false,
    listingAssistantSuggestion: null,
    aiActionLoading: false,
    auctionSummary: null,
    bidAdvice: null,
    categorySuggestion: null,
  },
  reducers: {
    createAuctionRequest(state) {
      state.loading = true;
    },
    createAuctionSuccess(state) {
      state.loading = false;
    },
    createAuctionFailed(state) {
      state.loading = false;
    },
    getAllAuctionItemRequest(state) {
      state.loading = true;
      state.auctionListError = null;
    },
    getAllAuctionItemSuccess(state, action) {
      state.loading = false;
      state.allAuctions = action.payload.items;
      state.auctionPagination =
        action.payload.pagination || state.auctionPagination;
      state.auctionFacets = action.payload.facets || state.auctionFacets;
      state.auctionQuery = action.payload.filters || {};
      state.serverTime = action.payload.serverTime;
      state.serverTimeReceivedAt = action.payload.receivedAt;
      state.auctionListError = null;
    },
    getAllAuctionItemFailed(state, action) {
      state.loading = false;
      state.auctionListError =
        action.payload || "Unable to load auctions. Please try again.";
    },
    getAuctionDetailRequest(state, action) {
      if (!action.payload?.silent) {
        state.loading = true;
      }
    },
    getAuctionDetailSuccess(state, action) {
      state.loading = false;
      state.auctionDetail = action.payload.auctionItem;
      state.auctionBidders = action.payload.bidders;
      state.myAutoBid = action.payload.myAutoBid || {
        active: false,
        maxAmount: null,
      };
      state.serverTime = action.payload.serverTime;
      state.serverTimeReceivedAt = action.payload.receivedAt;
    },
    getAuctionDetailFailed(state) {
      state.loading = false;
    },
    getMyAuctionsRequest(state) {
      state.loading = true;
      state.myAuctions = [];
    },
    getMyAuctionsSuccess(state, action) {
      state.loading = false;
      state.myAuctions = action.payload.items;
      state.serverTime = action.payload.serverTime;
      state.serverTimeReceivedAt = action.payload.receivedAt;
    },
    getMyAuctionsFailed(state) {
      state.loading = false;
      state.myAuctions = [];
    },
    deleteAuctionItemRequest(state) {
      state.loading = true;
    },
    deleteAuctionItemSuccess(state) {
      state.loading = false;
    },
    deleteAuctionItemFailed(state) {
      state.loading = false;
    },
    republishItemRequest(state) {
      state.loading = true;
    },
    republishItemSuccess(state) {
      state.loading = false;
    },
    republishItemFailed(state) {
      state.loading = false;
    },
    updateAuctionItemRequest(state) {
      state.loading = true;
    },
    updateAuctionItemSuccess(state) {
      state.loading = false;
    },
    updateAuctionItemFailed(state) {
      state.loading = false;
    },
    sellerDashboardSuccess(state, action) {
      state.sellerDashboard = action.payload;
      state.serverTime = action.payload.serverTime;
      state.serverTimeReceivedAt = action.payload.receivedAt;
    },
    auctionSyncSuccess(state, action) {
      const snapshot = action.payload.snapshot;
      state.serverTime = snapshot?.serverTime || action.payload.serverTime;
      state.serverTimeReceivedAt = action.payload.receivedAt;
      if (
        snapshot &&
        state.auctionDetail?._id?.toString?.() === snapshot.auctionId?.toString?.()
      ) {
        state.auctionDetail = {
          ...state.auctionDetail,
          currentBid: snapshot.currentBid,
          endTime: snapshot.endTime || state.auctionDetail.endTime,
          bidVersion: snapshot.bidVersion,
          lastBidAt: snapshot.lastBidAt,
          runtimeStatus: snapshot.runtimeStatus,
          isBiddable: snapshot.isBiddable,
        };
      }
    },
    smartRecommendationsSuccess(state, action) {
      state.smartRecommendations = action.payload.items;
      state.serverTime = action.payload.serverTime;
      state.serverTimeReceivedAt = action.payload.receivedAt;
    },
    assistAuctionListingRequest(state) {
      state.listingAssistantLoading = true;
      state.listingAssistantSuggestion = null;
    },
    assistAuctionListingSuccess(state, action) {
      state.listingAssistantLoading = false;
      state.listingAssistantSuggestion = action.payload;
    },
    assistAuctionListingFailed(state) {
      state.listingAssistantLoading = false;
    },
    clearListingAssistantSuggestion(state) {
      state.listingAssistantSuggestion = null;
      state.listingAssistantLoading = false;
    },
    aiActionRequest(state) {
      state.aiActionLoading = true;
    },
    aiActionFailed(state) {
      state.aiActionLoading = false;
    },
    auctionSummarySuccess(state, action) {
      state.aiActionLoading = false;
      state.auctionSummary = action.payload;
    },
    bidAdviceSuccess(state, action) {
      state.aiActionLoading = false;
      state.bidAdvice = action.payload;
    },
    categorySuggestionSuccess(state, action) {
      state.aiActionLoading = false;
      state.categorySuggestion = action.payload;
    },
    clearAuctionAi(state) {
      state.auctionSummary = null;
      state.bidAdvice = null;
      state.categorySuggestion = null;
      state.aiActionLoading = false;
    },

    resetSlice(state) {
      state.loading = false;
    },
  },
});

export const assistAuctionListing = (data) => async (dispatch) => {
  dispatch(auctionSlice.actions.assistAuctionListingRequest());
  try {
    const response = await api.post("/ai/auction-listing-assist", data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(
      auctionSlice.actions.assistAuctionListingSuccess(
        response.data.suggestion
      )
    );
    toast.success("AI listing suggestion ready");
    return response.data.suggestion;
  } catch (error) {
    dispatch(auctionSlice.actions.assistAuctionListingFailed());
    toastApiError(error);
    return null;
  }
};

const compactParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

export const getAllAuctionItems = (params = {}) => async (dispatch) => {
  dispatch(auctionSlice.actions.getAllAuctionItemRequest());
  try {
    const response = await api.get("/auctionitem/allitems", {
      params: compactParams(params),
    });
    dispatch(
      auctionSlice.actions.getAllAuctionItemSuccess({
        items: response.data.items,
        pagination: response.data.pagination,
        facets: response.data.facets,
        filters: response.data.filters,
        serverTime: response.data.serverTime,
        receivedAt: Date.now(),
      })
    );
    dispatch(auctionSlice.actions.resetSlice());
  } catch (error) {
    dispatch(auctionSlice.actions.getAllAuctionItemFailed(getErrorMessage(error)));
    console.error(error);
    dispatch(auctionSlice.actions.resetSlice());
  }
};

export const getMyAuctionItems = () => async (dispatch) => {
  dispatch(auctionSlice.actions.getMyAuctionsRequest());
  try {
    const response = await api.get("/auctionitem/myitems");
    dispatch(auctionSlice.actions.getMyAuctionsSuccess({
      items: response.data.items,
      serverTime: response.data.serverTime,
      receivedAt: Date.now(),
    }));
    dispatch(auctionSlice.actions.resetSlice());
  } catch (error) {
    dispatch(auctionSlice.actions.getMyAuctionsFailed());
    console.error(error);
    dispatch(auctionSlice.actions.resetSlice());
  }
};

export const getAuctionDetail = (id, options = {}) => async (dispatch) => {
  dispatch(auctionSlice.actions.getAuctionDetailRequest(options));
  try {
    const response = await api.get(`/auctionitem/auction/${id}`);
    dispatch(
      auctionSlice.actions.getAuctionDetailSuccess({
        ...response.data,
        receivedAt: Date.now(),
      })
    );
    dispatch(auctionSlice.actions.resetSlice());
  } catch (error) {
    dispatch(auctionSlice.actions.getAuctionDetailFailed());
    console.error(error);
    dispatch(auctionSlice.actions.resetSlice());
  }
};

export const createAuction = (data) => async (dispatch) => {
  dispatch(auctionSlice.actions.createAuctionRequest());
  try {
    const response = await api.post(
      "/auctionitem/create",
      data,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    dispatch(auctionSlice.actions.createAuctionSuccess());
    toast.success(response.data.message);
    dispatch(getAllAuctionItems());
    dispatch(auctionSlice.actions.resetSlice());
  } catch (error) {
    dispatch(auctionSlice.actions.createAuctionFailed());
    toastApiError(error);
    dispatch(auctionSlice.actions.resetSlice());
  }
};

export const checkAuctionSync =
  (id, knownBidVersion = null) =>
  async (dispatch) => {
    try {
      const response = await api.get(`/auctionitem/auction/${id}/sync`, {
        params:
          knownBidVersion === null || knownBidVersion === undefined
            ? {}
            : { knownBidVersion },
      });
      dispatch(
        auctionSlice.actions.auctionSyncSuccess({
          ...response.data,
          receivedAt: Date.now(),
        })
      );
      if (response.data.changed) {
        dispatch(getAuctionDetail(id, { silent: true }));
      }
      return response.data;
    } catch (error) {
      console.error(getErrorMessage(error));
      return { success: false };
    }
  };

export const republishAuction = (id, data) => async (dispatch) => {
  dispatch(auctionSlice.actions.republishItemRequest());
  try {
    const response = await api.put(
      `/auctionitem/item/republish/${id}`,
      data,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    dispatch(auctionSlice.actions.republishItemSuccess());
    toast.success(response.data.message);
    dispatch(getMyAuctionItems());
    dispatch(getAllAuctionItems());
    dispatch(auctionSlice.actions.resetSlice());
  } catch (error) {
    dispatch(auctionSlice.actions.republishItemFailed());
    toastApiError(error);
    console.error(getErrorMessage(error));
    dispatch(auctionSlice.actions.resetSlice());
  }
};

export const suggestAuctionCategory = (data) => async (dispatch) => {
  dispatch(auctionSlice.actions.aiActionRequest());
  try {
    const response = await api.post("/ai/category-suggest", data, {
      headers: { "Content-Type": "application/json" },
    });
    dispatch(
      auctionSlice.actions.categorySuggestionSuccess(response.data.suggestion)
    );
    toast.success("AI category suggestion ready");
    return response.data.suggestion;
  } catch (error) {
    dispatch(auctionSlice.actions.aiActionFailed());
    toastApiError(error);
    return null;
  }
};

export const summarizeAuction = (auction) => async (dispatch) => {
  dispatch(auctionSlice.actions.aiActionRequest());
  try {
    const response = await api.post(
      "/ai/auction-summary",
      { auction },
      { headers: { "Content-Type": "application/json" } }
    );
    dispatch(auctionSlice.actions.auctionSummarySuccess(response.data.summary));
    toast.success("AI summary ready");
    return response.data.summary;
  } catch (error) {
    dispatch(auctionSlice.actions.aiActionFailed());
    toastApiError(error);
    return null;
  }
};

export const getBidAdvice = (auction, intendedBid) => async (dispatch) => {
  dispatch(auctionSlice.actions.aiActionRequest());
  try {
    const response = await api.post(
      "/ai/bid-advice",
      { auction, intendedBid },
      { headers: { "Content-Type": "application/json" } }
    );
    dispatch(auctionSlice.actions.bidAdviceSuccess(response.data.advice));
    toast.success("AI bid advice ready");
    return response.data.advice;
  } catch (error) {
    dispatch(auctionSlice.actions.aiActionFailed());
    toastApiError(error);
    return null;
  }
};

export const saveAuctionDraft = (data) => async (dispatch) => {
  dispatch(auctionSlice.actions.createAuctionRequest());
  try {
    const response = await api.post("/auctionitem/draft", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(auctionSlice.actions.createAuctionSuccess());
    toast.success(response.data.message);
    dispatch(getMyAuctionItems());
    dispatch(auctionSlice.actions.resetSlice());
    return response.data;
  } catch (error) {
    dispatch(auctionSlice.actions.createAuctionFailed());
    toastApiError(error);
    dispatch(auctionSlice.actions.resetSlice());
    return { success: false };
  }
};

export const publishAuctionDraft = (id, data) => async (dispatch) => {
  dispatch(auctionSlice.actions.updateAuctionItemRequest());
  try {
    const response = await api.put(`/auctionitem/publish/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(auctionSlice.actions.updateAuctionItemSuccess());
    toast.success(response.data.message);
    dispatch(getMyAuctionItems());
    dispatch(getAllAuctionItems());
    dispatch(auctionSlice.actions.resetSlice());
    return response.data;
  } catch (error) {
    dispatch(auctionSlice.actions.updateAuctionItemFailed());
    toastApiError(error);
    dispatch(auctionSlice.actions.resetSlice());
    return { success: false };
  }
};

export const getSellerDashboard = () => async (dispatch) => {
  try {
    const response = await api.get("/auctionitem/seller-dashboard");
    dispatch(
      auctionSlice.actions.sellerDashboardSuccess({
        ...response.data,
        receivedAt: Date.now(),
      })
    );
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const updateFulfillmentStatus = (id, data) => async (dispatch) => {
  try {
    const response = await api.put(`/auctionitem/fulfillment/${id}/status`, data, {
      headers: { "Content-Type": "application/json" },
    });
    toast.success(response.data.message);
    dispatch(getSellerDashboard());
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const respondToFulfillmentIssue = (id, data) => async (dispatch) => {
  try {
    const response = await api.put(
      `/auctionitem/fulfillment/${id}/issue-response`,
      data,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    toast.success(response.data.message);
    dispatch(getSellerDashboard());
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const getSmartRecommendations = () => async (dispatch) => {
  try {
    const response = await api.get("/auctionitem/smart-recommendations");
    dispatch(
      auctionSlice.actions.smartRecommendationsSuccess({
        items: response.data.items,
        serverTime: response.data.serverTime,
        receivedAt: Date.now(),
      })
    );
  } catch (error) {
    console.error(getErrorMessage(error));
  }
};

export const reviewSeller = (id, data) => async () => {
  try {
    const response = await api.post(`/auctionitem/review/${id}`, data, {
      headers: { "Content-Type": "application/json" },
    });
    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    toastApiError(error);
    return { success: false };
  }
};

export const updateAuction = (id, data) => async (dispatch) => {
  dispatch(auctionSlice.actions.updateAuctionItemRequest());
  try {
    const response = await api.put(`/auctionitem/update/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    dispatch(auctionSlice.actions.updateAuctionItemSuccess());
    toast.success(response.data.message);
    dispatch(getMyAuctionItems());
    dispatch(getAllAuctionItems());
    dispatch(auctionSlice.actions.resetSlice());
    return response.data;
  } catch (error) {
    dispatch(auctionSlice.actions.updateAuctionItemFailed());
    toastApiError(error);
    dispatch(auctionSlice.actions.resetSlice());
    return { success: false };
  }
};

export const deleteAuction = (id) => async (dispatch) => {
  dispatch(auctionSlice.actions.deleteAuctionItemRequest());
  try {
    const response = await api.delete(`/auctionitem/delete/${id}`);
    dispatch(auctionSlice.actions.deleteAuctionItemSuccess());
    toast.success(response.data.message);
    dispatch(getMyAuctionItems());
    dispatch(getAllAuctionItems());
    dispatch(auctionSlice.actions.resetSlice());
  } catch (error) {
    dispatch(auctionSlice.actions.deleteAuctionItemFailed());
    toastApiError(error);
    console.error(getErrorMessage(error));
    dispatch(auctionSlice.actions.resetSlice());
  }
};

export const clearListingAssistantSuggestion = () => (dispatch) => {
  dispatch(auctionSlice.actions.clearListingAssistantSuggestion());
};

export const clearAuctionAi = () => (dispatch) => {
  dispatch(auctionSlice.actions.clearAuctionAi());
};

export default auctionSlice.reducer;
