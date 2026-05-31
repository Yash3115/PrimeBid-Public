import {
  assistAuctionListing,
  clearListingAssistantSuggestion,
  createAuction,
  saveAuctionDraft,
  suggestAuctionCategory,
} from "@/store/slices/auctionSlice";
import Spinner from "@/custom-components/Spinner";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { CalendarClock, Check, Gauge, ImagePlus, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */
const compressAuctionImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const targetWidth = 1280;
        const targetHeight = 960;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d");
        const sourceRatio = image.width / image.height;
        const targetRatio = targetWidth / targetHeight;
        let sx = 0;
        let sy = 0;
        let sw = image.width;
        let sh = image.height;
        if (sourceRatio > targetRatio) {
          sw = image.height * targetRatio;
          sx = (image.width - sw) / 2;
        } else {
          sh = image.width / targetRatio;
          sy = (image.height - sh) / 2;
        }
        context.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                type: "image/webp",
              })
            );
          },
          "image/webp",
          0.82
        );
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const CreateAuction = () => {
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [minimumBidIncrement, setMinimumBidIncrement] = useState(100);
  const [antiSnipingExtensionMinutes, setAntiSnipingExtensionMinutes] = useState(2);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const auctionCategories = [
    "Electronics",
    "Furniture",
    "Art & Antiques",
    "Jewelry & Watches",
    "Automobiles",
    "Real Estate",
    "Collectibles",
    "Fashion & Accessories",
    "Sports Memorabilia",
    "Books & Manuscripts",
  ];

  const dispatch = useDispatch();
  const {
    aiActionLoading,
    categorySuggestion,
    loading,
    listingAssistantLoading,
    listingAssistantSuggestion,
  } =
    useSelector((state) => state.auction);
  const { authChecked, isAuthenticated, user } = useSelector((state) => state.user);
  const kycApproved = user.kycStatus === "Approved";
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role !== "Auctioneer") {
      navigateTo("/");
    }
  }, [authChecked, isAuthenticated, navigateTo, user.role]);

  const listingScore = useMemo(() => {
    let score = 0;
    if (title.trim().length >= 12) score += 18;
    if (description.trim().length >= 120) score += 24;
    if (category) score += 12;
    if (condition) score += 12;
    if (Number(startingBid) > 0) score += 14;
    if (description.trim().length >= 240) score += 10;
    if (/\b(original|certificate|warranty|serial|receipt|dimensions|year|model)\b/i.test(description)) score += 10;
    const recommended = Math.max(1, Math.round(Number(startingBid || 0) * (condition === "New" ? 1.35 : 1.18)));
    return {
      score: Math.min(100, score),
      recommended,
      low: Math.round(recommended * 0.82),
      high: Math.round(recommended * 1.18),
    };
  }, [category, condition, description, startingBid, title]);

  const imageHandler = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressedFile = await compressAuctionImage(file);
    const reader = new FileReader();
    reader.readAsDataURL(compressedFile);
    reader.onload = () => {
      setImage(compressedFile);
      setImagePreview(reader.result);
    };
  };

  const handleCreateAuction = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("image", image);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("condition", condition);
    formData.append("startingBid", startingBid);
    formData.append("minimumBidIncrement", minimumBidIncrement);
    formData.append("antiSnipingExtensionMinutes", antiSnipingExtensionMinutes);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);
    dispatch(createAuction(formData));
  };

  const handleSaveDraft = () => {
    const formData = new FormData();
    if (image) formData.append("image", image);
    formData.append("title", title || "Untitled draft");
    formData.append("description", description);
    formData.append("category", category);
    formData.append("condition", condition);
    formData.append("startingBid", startingBid);
    if (startTime) formData.append("startTime", startTime);
    if (endTime) formData.append("endTime", endTime);
    dispatch(saveAuctionDraft(formData));
  };

  const setAuctionWindow = (durationHours) => {
    const start = new Date(Date.now() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    setStartTime(start);
    setEndTime(end);
  };

  const handleAssistListing = () => {
    dispatch(
      assistAuctionListing({
        title,
        description,
        category,
        condition,
      })
    );
  };

  const handleSuggestCategory = () => {
    dispatch(
      suggestAuctionCategory({
        title,
        description,
      })
    );
  };

  const applySuggestion = (field) => {
    const suggestion = listingAssistantSuggestion;
    if (!suggestion) return;

    const applyAll = field === "all";
    if ((applyAll || field === "title") && suggestion.title) {
      setTitle(suggestion.title);
    }
    if ((applyAll || field === "description") && suggestion.description) {
      setDescription(suggestion.description);
    }
    if ((applyAll || field === "category") && suggestion.category) {
      setCategory(suggestion.category);
    }
    if ((applyAll || field === "condition") && suggestion.condition) {
      setCondition(suggestion.condition);
    }
  };

  const applyCategorySuggestion = () => {
    if (!categorySuggestion) return;
    if (categorySuggestion.category) setCategory(categorySuggestion.category);
    if (categorySuggestion.condition) setCondition(categorySuggestion.condition);
  };

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  const listingChecklist = [
    ["Clear title", title.trim().length >= 12],
    ["Detailed description", description.trim().length >= 120],
    ["Category and condition", Boolean(category && condition)],
    ["Opening bid and increment", Number(startingBid) > 0 && Number(minimumBidIncrement) > 0],
    ["Auction window", Boolean(startTime && endTime)],
    ["Product image", Boolean(imagePreview)],
  ];

  return (
    <section className="app-page">
      <div className="app-container">
        <div className="page-header mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="app-kicker">
              Seller tools
            </p>
            <h1 className="app-title">
              Create Auction
            </h1>
            <p className="app-subtitle">
              Build a high-confidence listing with clear item details, bidding rules,
              timing, and settlement expectations.
            </p>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            KYC status: {user.kycStatus || "Not Submitted"}
          </div>
        </div>

        {!authChecked ? (
          <Spinner />
        ) : !kycApproved ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <h2 className="text-xl font-bold">KYC approval required</h2>
            <p className="mt-2 leading-7">
              Auctioneer KYC must be approved before you can save drafts,
              publish, or create auctions. Current status:{" "}
              <span className="font-semibold">
                {user.kycStatus || "Not Submitted"}
              </span>
              .
            </p>
            <Link
              to="/kyc-verification"
              className="mt-4 inline-flex rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
            >
              Submit KYC
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <form
          className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          onSubmit={handleCreateAuction}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Title">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select Category</option>
                {auctionCategories.map((element) => (
                  <option key={element} value={element}>
                    {element}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select Condition</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
            </Field>
            <Field label="Starting Bid">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Minimum Bid Increment">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={minimumBidIncrement}
                onChange={(e) => setMinimumBidIncrement(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Last-Minute Extension">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={antiSnipingExtensionMinutes}
                onChange={(e) => setAntiSnipingExtensionMinutes(e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_1fr] md:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <Gauge className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Quality Score
                </p>
                <p className="text-2xl font-bold text-slate-950">
                  {listingScore.score}/100
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <span>Low {formatCurrency(listingScore.low)}</span>
              <span className="font-semibold text-slate-950">
                Suggested {formatCurrency(listingScore.recommended)}
              </span>
              <span>High {formatCurrency(listingScore.high)}</span>
            </div>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-y`}
              rows={8}
              required
            />
          </Field>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  AI Listing Assistant
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Generate a cleaner draft from the title and description you
                  have entered.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleAssistListing}
                disabled={listingAssistantLoading || (!title && !description)}
              >
                <Sparkles className="h-4 w-4" />
                {listingAssistantLoading ? "Improving..." : "Improve with AI"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSuggestCategory}
                disabled={aiActionLoading || (!title && !description)}
              >
                <Sparkles className="h-4 w-4" />
                {aiActionLoading ? "Checking..." : "Suggest Category"}
              </button>
            </div>

            {categorySuggestion && (
              <div className="mt-5 rounded-md border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-indigo-950">
                      {categorySuggestion.category} / {categorySuggestion.condition}
                    </p>
                    <p className="mt-1 text-sm text-indigo-800">
                      {categorySuggestion.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyCategorySuggestion}
                    className="inline-flex w-fit items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Check className="h-4 w-4" />
                    Apply
                  </button>
                </div>
              </div>
            )}

            {listingAssistantSuggestion && (
              <div className="mt-5 grid gap-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <ApplyButton onClick={() => applySuggestion("all")}>
                    Apply All
                  </ApplyButton>
                  <ApplyButton onClick={() => applySuggestion("title")}>
                    Apply Title
                  </ApplyButton>
                  <ApplyButton onClick={() => applySuggestion("description")}>
                    Apply Description
                  </ApplyButton>
                  <ApplyButton onClick={() => applySuggestion("category")}>
                    Apply Category
                  </ApplyButton>
                  <ApplyButton onClick={() => applySuggestion("condition")}>
                    Apply Condition
                  </ApplyButton>
                  <button
                    type="button"
                    onClick={() => dispatch(clearListingAssistantSuggestion())}
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SuggestionValue
                    label="Suggested Title"
                    value={listingAssistantSuggestion.title}
                  />
                  <SuggestionValue
                    label="Suggested Category"
                    value={listingAssistantSuggestion.category}
                  />
                  <SuggestionValue
                    label="Suggested Condition"
                    value={listingAssistantSuggestion.condition}
                  />
                  <SuggestionList
                    label="Selling Points"
                    items={listingAssistantSuggestion.sellingPoints}
                  />
                </div>

                <SuggestionValue
                  label="Suggested Description"
                  value={listingAssistantSuggestion.description}
                  multiline
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <SuggestionList
                    label="Missing Details"
                    items={listingAssistantSuggestion.missingDetails}
                  />
                  <SuggestionList
                    label="Quality Tips"
                    items={listingAssistantSuggestion.qualityTips}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["Auction Starting Time", startTime, setStartTime],
              ["Auction End Time", endTime, setEndTime],
            ].map(([label, value, setter]) => (
              <Field label={label} key={label}>
                <span className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <CalendarClock className="h-5 w-5 text-slate-400" />
                  <DatePicker
                    selected={value}
                    onChange={(date) => setter(date)}
                    showTimeSelect
                    minDate={label === "Auction End Time" && startTime ? startTime : new Date()}
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    className="w-full bg-transparent py-1 outline-none"
                    required
                  />
                </span>
              </Field>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["24h window", 24],
              ["3 days", 72],
              ["7 days", 168],
            ].map(([label, hours]) => (
              <button
                key={label}
                type="button"
                onClick={() => setAuctionWindow(hours)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
              >
                {label}
              </button>
            ))}
          </div>

          <Field label="Auction Item Image">
            <label
              htmlFor="dropzone-file"
              className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={title || "Auction preview"}
                  className="max-h-56 rounded-md object-contain"
                />
              ) : (
                <>
                  <ImagePlus className="mb-4 h-9 w-9 text-indigo-600" />
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-950">
                      Click to upload
                    </span>{" "}
                    an auction image
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PNG, JPG, JPEG, or WebP
                  </p>
                </>
              )}
              <input
                id="dropzone-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={imageHandler}
                required
              />
            </label>
          </Field>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="btn-primary w-full sm:w-fit"
              disabled={loading}
            >
              {loading ? "Creating Auction..." : "Create Auction"}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="btn-secondary w-full sm:w-fit"
              disabled={loading}
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
          </div>
        </form>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
          <div className="flex flex-col gap-4">
            <img
              src={imagePreview || "/imageHolder.jpg"}
              alt={title || "Auction preview"}
              className="aspect-[4/3] w-full rounded-md bg-slate-100 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">
                Listing Preview
              </p>
              <h2 className="mt-2 truncate text-2xl font-bold text-slate-950">
                {title || "Untitled auction"}
              </h2>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <span>{category || "No category selected"}</span>
                <span>{condition || "No condition selected"}</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(startingBid)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {formatDateTime(startTime)} to {formatDateTime(endTime)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-950">
                  Launch readiness
                </p>
                <span className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                  {listingScore.score}/100
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {listingChecklist.map(([label, complete]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-slate-700">{label}</span>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold ${
                        complete
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {complete ? "Ready" : "Needed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
          </div>
        )}
      </div>
    </section>
  );
};

const Field = ({ label, children }) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    {children}
  </label>
);

const ApplyButton = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
  >
    <Check className="h-4 w-4" />
    {children}
  </button>
);

const SuggestionValue = ({ label, value, multiline = false }) => (
  <div className="grid gap-1">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p
      className={`rounded-md bg-white px-3 py-2 text-sm leading-6 text-slate-700 ${
        multiline ? "whitespace-pre-line" : ""
      }`}
    >
      {value || "Not suggested"}
    </p>
  </div>
);

const SuggestionList = ({ label, items = [] }) => (
  <div className="grid gap-1">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    {items.length > 0 ? (
      <ul className="grid gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="leading-6">
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-500">
        None
      </p>
    )}
  </div>
);

export default CreateAuction;
