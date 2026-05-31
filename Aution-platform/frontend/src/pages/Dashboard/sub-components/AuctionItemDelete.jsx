import { formatCurrency, getAuctionStatus } from "@/lib/format";
import { deleteAuctionItem } from "@/store/slices/superAdminSlice";
import { Eye, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

const AuctionItemDelete = () => {
  const { allAuctions, serverTime, serverTimeReceivedAt } = useSelector(
    (state) => state.auction
  );
  const dispatch = useDispatch();

  const handleAuctionDelete = (auction) => {
    const confirmed = window.confirm(
      `Delete "${auction.title}" from PrimeBid? This moderation action cannot be undone.`
    );
    if (confirmed) {
      dispatch(deleteAuctionItem(auction._id));
    }
  };

  return (
    <>
      <div className="mb-10 overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-slate-900 text-sm text-white">
            <tr>
              <th className="px-4 py-3 text-left">Auction</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Current Bid</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {allAuctions.length > 0 ? (
              allAuctions.map((element) => {
                const status = getAuctionStatus(
                  element,
                  undefined,
                  serverTime,
                  serverTimeReceivedAt
                );
                return (
                  <tr key={element._id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[260px] items-center gap-3">
                        <img
                          src={element.image?.url || "/imageHolder.jpg"}
                          alt={element.title}
                          className="h-14 w-14 rounded-md object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950">
                            {element.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {element.category || "Uncategorized"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">
                      {formatCurrency(element.currentBid || element.startingBid)}
                    </td>
                    <td className="flex gap-2 px-4 py-3">
                      <Link
                        to={`/auction/details/${element._id}`}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        onClick={() => handleAuctionDelete(element)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan="4">
                  No auctions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AuctionItemDelete;
