import CardTwo from "@/custom-components/CardTwo";
import Spinner from "@/custom-components/Spinner";
import { getMyAuctionItems } from "@/store/slices/auctionSlice";
import { PlusCircle } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const ViewMyAuctions = () => {
  const { myAuctions, loading } = useSelector((state) => state.auction);
  const { authChecked, user, isAuthenticated } = useSelector((state) => state.user);

  const dispatch = useDispatch();
  const navigateTo = useNavigate();

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated || user.role !== "Auctioneer") {
      navigateTo("/");
      return;
    }
    dispatch(getMyAuctionItems());
  }, [authChecked, dispatch, isAuthenticated, navigateTo, user.role]);

  return (
    <section className="app-page">
      <div className="app-container">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-kicker">
              Seller tools
            </p>
            <h1 className="app-title">
              My Auctions
            </h1>
          </div>
          <Link
            to="/create-auction"
            className="inline-flex w-fit items-center gap-2 rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            Create Auction
          </Link>
        </div>

        {!authChecked || loading ? (
          <Spinner />
        ) : myAuctions.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {myAuctions.map((element) => (
              <CardTwo
                title={element.title}
                startingBid={element.startingBid}
                endTime={element.endTime}
                startTime={element.startTime}
                imgSrc={element.image?.url}
                currentBid={element.currentBid}
                category={element.category}
                condition={element.condition}
                description={element.description}
                status={element.status}
                runtimeStatus={element.runtimeStatus}
                minimumBidIncrement={element.minimumBidIncrement}
                antiSnipingExtensionMinutes={element.antiSnipingExtensionMinutes}
                qualityScore={element.qualityScore}
                id={element._id}
                key={element._id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              You have not posted any auctions yet.
            </h2>
            <p className="mt-2 text-slate-600">
              Create your first auction to start accepting bids.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ViewMyAuctions;
