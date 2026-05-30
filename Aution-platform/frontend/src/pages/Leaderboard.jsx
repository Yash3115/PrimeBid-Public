import Spinner from "@/custom-components/Spinner";
import { formatCurrency } from "@/lib/format";
import { Trophy } from "lucide-react";
import { useSelector } from "react-redux";

const Leaderboard = () => {
  const { loading, leaderboard } = useSelector((state) => state.user);

  return (
    <section className="app-page">
      <div className="app-container">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-kicker">
              Rankings
            </p>
            <h1 className="app-title">
              Leaderboard
            </h1>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-md bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            <Trophy className="h-4 w-4" />
            Top {Math.min(leaderboard.length, 100)} bidders
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Bidder</th>
                  <th className="px-4 py-3 text-left">Bid Expenditure</th>
                  <th className="px-4 py-3 text-left">Auctions Won</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 100).map((element, index) => (
                  <tr key={element._id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-bold text-slate-400">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={element.profileImage?.url || "/imageHolder.jpg"}
                          alt={element.userName}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        <span className="font-semibold text-slate-950">
                          {element.userName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">
                      {formatCurrency(element.moneySpent || element.moneyspend)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {element.auctionsWon || 0}
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan="4">
                      No leaderboard entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default Leaderboard;
