/* eslint-disable react/prop-types */
import { formatCurrency, getAuctionCountdown, getAuctionStatus } from "@/lib/format";
import { deleteAuction, publishAuctionDraft, republishAuction, updateAuction } from "@/store/slices/auctionSlice";
import { CalendarClock, Eye, Pencil, Rocket, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

const statusTone = {
  Draft: "border-amber-200 bg-amber-50 text-amber-700",
  Live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Upcoming: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Ended: "border-slate-200 bg-slate-100 text-slate-600",
  Invalid: "border-red-200 bg-red-50 text-red-700",
};

const CardTwo = ({
  imgSrc,
  title,
  startingBid,
  currentBid,
  category,
  condition,
  description,
  status: itemStatus,
  minimumBidIncrement,
  antiSnipingExtensionMinutes,
  qualityScore,
  startTime,
  endTime,
  runtimeStatus,
  id,
}) => {
  const { serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const auctionTime = useMemo(
    () => ({ startTime, endTime, runtimeStatus }),
    [endTime, runtimeStatus, startTime]
  );
  const [timeLeft, setTimeLeft] = useState(() =>
    getAuctionCountdown(auctionTime, undefined, serverTime, serverTimeReceivedAt)
  );
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openEditDrawer, setOpenEditDrawer] = useState(false);
  const dispatch = useDispatch();
  const status =
    itemStatus === "Draft"
      ? "Draft"
      : getAuctionStatus(auctionTime, undefined, serverTime, serverTimeReceivedAt);

  useEffect(() => {
    setTimeLeft(
      getAuctionCountdown(auctionTime, undefined, serverTime, serverTimeReceivedAt)
    );
    const timer = setInterval(() => {
      setTimeLeft(
        getAuctionCountdown(auctionTime, undefined, serverTime, serverTimeReceivedAt)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [auctionTime, serverTime, serverTimeReceivedAt]);

  const formatTimeLeft = ({ days, hours, minutes, seconds }) => {
    const pad = (num) => String(num).padStart(2, "0");
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${title}"? This removes the auction from the marketplace.`
    );
    if (confirmed) {
      dispatch(deleteAuction(id));
    }
  };

  return (
    <>
      <div className="app-card app-card-hover flex min-h-[460px] flex-col overflow-hidden">
        <div className="relative aspect-[4/3] bg-slate-100">
          <img
            src={imgSrc || "/imageHolder.jpg"}
            alt={title}
            className="h-full w-full object-cover"
          />
          <span
            className={`absolute left-3 top-3 rounded-md border px-3 py-1 text-xs font-semibold shadow-sm ${
              statusTone[status] || statusTone.Ended
            }`}
          >
            {status}
          </span>
          {category && (
            <span className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {category}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between gap-4 p-4">
          <div>
            <h3 className="line-clamp-2 text-lg font-semibold text-slate-950">
              {title}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Current
                <span className="block break-words text-lg font-bold leading-tight text-slate-950 tabular-nums">
                  {formatCurrency(currentBid || startingBid)}
                </span>
              </p>
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Starting
                <span className="block break-words text-lg font-bold leading-tight text-slate-950 tabular-nums">
                  {formatCurrency(startingBid)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex min-h-11 items-center rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold leading-5 text-indigo-700">
            {status === "Draft"
              ? "Draft saved"
              : Object.keys(timeLeft).length
              ? `${timeLeft.type}: ${formatTimeLeft(timeLeft)}`
              : "Auction ended"}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
            <p className="rounded-md bg-slate-50 px-3 py-2">
              Increment
              <span className="block break-words font-semibold leading-tight text-slate-950 tabular-nums">
                {formatCurrency(minimumBidIncrement || 100)}
              </span>
            </p>
            <p className="rounded-md bg-slate-50 px-3 py-2">
              Score
              <span className="block font-semibold text-slate-950">
                {qualityScore || 0}/100
              </span>
            </p>
          </div>

          <div className="grid gap-2">
            <Link
              className="btn-primary"
              to={`/auction/details/${id}`}
            >
              <Eye className="h-4 w-4" />
              View Auction
            </Link>
            <button
              className="btn-danger"
              onClick={handleDelete}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Delete Auction
            </button>
            <button
              disabled={!["Upcoming", "Invalid", "Draft"].includes(status)}
              onClick={() => setOpenEditDrawer(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              <Pencil className="h-4 w-4" />
              Edit Before Start
            </button>
            <button
              disabled={["Draft", "Upcoming", "Live"].includes(status)}
              onClick={() => setOpenDrawer(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Republish Auction
            </button>
          </div>
        </div>
      </div>
      <Drawer id={id} openDrawer={openDrawer} setOpenDrawer={setOpenDrawer} />
      <EditDrawer
        auction={{
          id,
          title,
          description,
          category,
          condition,
          startingBid,
          startTime,
          endTime,
          status: itemStatus,
          minimumBidIncrement,
          antiSnipingExtensionMinutes,
        }}
        openDrawer={openEditDrawer}
        setOpenDrawer={setOpenEditDrawer}
      />
    </>
  );
};

export default CardTwo;

const Drawer = ({ setOpenDrawer, openDrawer, id }) => {
  const dispatch = useDispatch();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const { loading } = useSelector((state) => state.auction);

  if (!openDrawer || !id) return null;

  const handleRepublishAuction = () => {
    dispatch(republishAuction(id, { startTime, endTime }));
  };

  return (
    <section
      className="fixed inset-0 z-50 flex items-end bg-slate-950/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="republish-auction-title"
    >
      <div className="w-full rounded-t-lg bg-white shadow-2xl">
        <div className="mx-auto w-full max-w-2xl px-5 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker">
                Republish
              </p>
              <h3 id="republish-auction-title" className="mt-2 text-2xl font-semibold text-slate-950">
                Set a new auction window
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenDrawer(false)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form className="mt-6 grid gap-5">
            {[
              ["Start Time", startTime, setStartTime],
              ["End Time", endTime, setEndTime],
            ].map(([label, value, setter]) => (
              <label key={label} className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {label}
                </span>
                <span className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <CalendarClock className="h-5 w-5 text-slate-400" />
                  <DatePicker
                    selected={value}
                    onChange={(date) => setter(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    className="w-full bg-transparent py-1 outline-none"
                  />
                </span>
              </label>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                onClick={handleRepublishAuction}
                disabled={loading || !startTime || !endTime}
              >
                {loading ? "Republishing..." : "Republish"}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setOpenDrawer(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

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

const EditDrawer = ({ auction, setOpenDrawer, openDrawer }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auction);
  const [title, setTitle] = useState(auction.title || "");
  const [description, setDescription] = useState(auction.description || "");
  const [category, setCategory] = useState(auction.category || "");
  const [condition, setCondition] = useState(auction.condition || "");
  const [startingBid, setStartingBid] = useState(auction.startingBid || "");
  const [minimumBidIncrement, setMinimumBidIncrement] = useState(auction.minimumBidIncrement || 100);
  const [antiSnipingExtensionMinutes, setAntiSnipingExtensionMinutes] = useState(auction.antiSnipingExtensionMinutes || 2);
  const [startTime, setStartTime] = useState(auction.startTime ? new Date(auction.startTime) : "");
  const [endTime, setEndTime] = useState(auction.endTime ? new Date(auction.endTime) : "");
  const [image, setImage] = useState("");

  useEffect(() => {
    setTitle(auction.title || "");
    setDescription(auction.description || "");
    setCategory(auction.category || "");
    setCondition(auction.condition || "");
    setStartingBid(auction.startingBid || "");
    setMinimumBidIncrement(auction.minimumBidIncrement || 100);
    setAntiSnipingExtensionMinutes(auction.antiSnipingExtensionMinutes || 2);
    setStartTime(auction.startTime ? new Date(auction.startTime) : "");
    setEndTime(auction.endTime ? new Date(auction.endTime) : "");
    setImage("");
  }, [auction]);

  if (!openDrawer || !auction.id) return null;

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("condition", condition);
    formData.append("startingBid", startingBid);
    formData.append("minimumBidIncrement", minimumBidIncrement);
    formData.append("antiSnipingExtensionMinutes", antiSnipingExtensionMinutes);
    formData.append("startTime", startTime);
    formData.append("endTime", endTime);
    if (image) formData.append("image", image);
    return formData;
  };

  const handleUpdate = async () => {
    const formData = buildFormData();
    const result = await dispatch(updateAuction(auction.id, formData));
    if (result?.success) {
      setOpenDrawer(false);
    }
  };

  const handlePublish = async () => {
    const result = await dispatch(publishAuctionDraft(auction.id, buildFormData()));
    if (result?.success) {
      setOpenDrawer(false);
    }
  };

  return (
    <section
      className="fixed inset-0 z-50 flex items-end bg-slate-950/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-auction-title"
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-2xl">
        <div className="mx-auto w-full max-w-3xl px-5 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-kicker">
                Edit auction
              </p>
              <h3 id="edit-auction-title" className="mt-2 text-2xl font-semibold text-slate-950">
                Update details before bidding starts
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenDrawer(false)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form className="mt-6 grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Starting Bid">
                <input type="number" min="1" value={startingBid} onChange={(e) => setStartingBid(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Minimum Bid Increment">
                <input type="number" min="1" value={minimumBidIncrement} onChange={(e) => setMinimumBidIncrement(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Last-Minute Extension">
                <input type="number" min="0" value={antiSnipingExtensionMinutes} onChange={(e) => setAntiSnipingExtensionMinutes(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  {auctionCategories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={`${inputClass} resize-y`} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Start Time", startTime, setStartTime],
                ["End Time", endTime, setEndTime],
              ].map(([label, value, setter]) => (
                <Field label={label} key={label}>
                  <span className="flex items-center gap-3 rounded-md border border-slate-300 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                    <CalendarClock className="h-5 w-5 text-slate-400" />
                    <DatePicker
                      selected={value}
                      onChange={(date) => setter(date)}
                      showTimeSelect
                      minDate={new Date()}
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="w-full bg-transparent py-1 outline-none"
                    />
                  </span>
                </Field>
              ))}
            </div>

            <Field label="Replace Image">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImage(e.target.files?.[0] || "")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                onClick={handleUpdate}
                disabled={loading || !title || !description || !category || !condition || !startingBid || !startTime || !endTime}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              {auction.status === "Draft" && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  onClick={handlePublish}
                  disabled={loading || !title || !description || !category || !condition || !startingBid || !startTime || !endTime}
                >
                  <Rocket className="h-4 w-4" />
                  Publish
                </button>
              )}
              <button
                type="button"
                className="rounded-md border border-slate-300 px-5 py-3 font-semibold text-slate-800 transition hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setOpenDrawer(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const Field = ({ label, children }) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    {children}
  </label>
);
