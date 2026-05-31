import Spinner from "@/custom-components/Spinner";
import { formatCurrency, formatDateTime, getAuctionStatus } from "@/lib/format";
import { getAuctionDetail } from "@/store/slices/auctionSlice";
import { Home, List } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";

/* eslint-disable react/prop-types */
const getRank = (index) => {
  if (index === 0) return "1st";
  if (index === 1) return "2nd";
  if (index === 2) return "3rd";
  return `${index + 1}th`;
};

const ViewAuctionDetails = () => {
  const { id } = useParams();
  const { loading, auctionDetail, auctionBidders, serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const { authChecked, isAuthenticated, user } = useSelector((state) => state.user);
  const navigateTo = useNavigate();
  const dispatch = useDispatch();

  const bidders = Array.isArray(auctionBidders) ? auctionBidders : [];
  const status = getAuctionStatus(
    auctionDetail,
    undefined,
    serverTime,
    serverTimeReceivedAt
  );
  const closureStatus = auctionDetail.closureStatus || "Open";
  const fulfillmentSummary = auctionDetail.fulfillmentSummary;
  const descriptionItems = useMemo(
    () =>
      auctionDetail.description
        ? auctionDetail.description.split(". ").filter(Boolean)
        : [],
    [auctionDetail.description]
  );

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role === "Bidder") {
      navigateTo("/");
      return;
    }
    if (id) {
      dispatch(getAuctionDetail(id));
    }
  }, [authChecked, dispatch, id, isAuthenticated, navigateTo, user.role]);

  return (
    <section className="app-page">
      <div className="app-container flex flex-col gap-6">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link to="/" className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-indigo-700">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <span>/</span>
          <Link to="/view-my-auctions" className="font-semibold text-slate-700 hover:text-indigo-700">
            My Auctions
          </Link>
          <span>/</span>
          <span className="max-w-[260px] truncate">{auctionDetail.title}</span>
        </nav>

        {!authChecked || loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)] lg:p-6">
                <div className="overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={auctionDetail.image?.url || "/imageHolder.jpg"}
                    alt={auctionDetail.title}
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex rounded-md bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                    {status}
                  </span>
                  <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
                    {auctionDetail.title}
                  </h1>
                  <div className="fluid-stat-grid mt-5 grid gap-3">
                    <Info label="Condition" value={auctionDetail.condition || "Not set"} />
                    <Info label="Category" value={auctionDetail.category || "Not set"} />
                    <Info label="Minimum Bid" value={formatCurrency(auctionDetail.startingBid)} />
                    <Info label="Current Bid" value={formatCurrency(auctionDetail.currentBid || auctionDetail.startingBid)} />
                    <Info label="Close State" value={status === "Ended" ? closureStatus : status} />
                    <Info label="Handoff" value={fulfillmentSummary?.status || "Not started"} />
                    <Info label="Starts" value={formatDateTime(auctionDetail.startTime)} />
                    <Info label="Ends" value={formatDateTime(auctionDetail.endTime)} />
                  </div>
                  {status === "Ended" && (
                    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                      <p className="font-semibold text-slate-950">
                        {closureStatus === "Processing"
                          ? "Winner and escrow are being finalized"
                          : closureStatus === "NoWinner"
                            ? "Closed without a winner"
                            : "Post-auction handoff"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {fulfillmentSummary?.hasDeliveryAddress
                          ? "The winner has added delivery details. Continue dispatch from the seller dashboard."
                          : fulfillmentSummary
                            ? "PrimeBid notified the winner to add delivery details before dispatch."
                            : "PrimeBid is preparing the winner handoff and settlement record."}
                      </p>
                      <Link
                        to="/seller-dashboard#fulfillment"
                        className="mt-3 inline-flex min-h-10 items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        Open fulfillment queue
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 p-5 md:p-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                  <List className="h-5 w-5 text-indigo-600" />
                  Description
                </h2>
                {descriptionItems.length > 0 ? (
                  <ul className="mt-4 grid gap-3 text-slate-600">
                    {descriptionItems.map((element) => (
                      <li key={element} className="rounded-md bg-slate-50 p-3 leading-7">
                        {element}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-slate-500">No description provided.</p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h2 className="text-xl font-semibold text-slate-950">
                  Bid Activity
                </h2>
                <span className="text-sm font-semibold text-slate-500">
                  {bidders.length} bids
                </span>
              </div>

              <div className="max-h-[650px] overflow-y-auto p-5">
                {bidders.length > 0 ? (
                  <div className="grid gap-3">
                    {bidders.map((element, index) => (
                      <div
                        key={`${element.userName}-${index}`}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-slate-200 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={element.profileImage || "/imageHolder.jpg"}
                            alt={element.userName}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                          <p className="truncate font-semibold text-slate-950">
                            {element.userName}
                          </p>
                        </div>
                        <p className="font-bold text-indigo-700">
                          {formatCurrency(element.amount)}
                        </p>
                        <p className="w-10 text-right font-semibold text-slate-500">
                          {getRank(index)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                    No bid activity for this auction yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-md bg-slate-50 p-3">
    <p className="stat-label">{label}</p>
    <p className="stat-value">{value}</p>
  </div>
);

export default ViewAuctionDetails;
