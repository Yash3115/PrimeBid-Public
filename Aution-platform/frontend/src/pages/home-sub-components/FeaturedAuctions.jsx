import Card from "@/custom-components/Card";
import { useSelector } from "react-redux";

const FeaturedAuctions = () => {
  const { allAuctions } = useSelector((state) => state.auction);
  return (
    <>
      <section className="my-8">
        <h3 className="mb-4 text-2xl font-semibold text-slate-950 md:text-3xl">
          Featured Auctions
        </h3>
        {allAuctions.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {allAuctions.slice(0, 8).map((element) => {
              return (
                <Card
                  title={element.title}
                  imgSrc={element.image?.url}
                  startTime={element.startTime}
                  endTime={element.endTime}
                  startingBid={element.startingBid}
                  currentBid={element.currentBid}
                  category={element.category}
                  description={element.description}
                  minimumBidIncrement={element.minimumBidIncrement}
                  bidCount={element.bids?.length || 0}
                  runtimeStatus={element.runtimeStatus}
                  auctionServerTime={element.serverTime}
                  createdBy={element.createdBy}
                  sellerQuality={element.sellerQuality}
                  id={element._id}
                  key={element._id}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-600">
            No featured auctions are available yet.
          </div>
        )}
      </section>
    </>
  );
};

export default FeaturedAuctions;
