import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const Leaderboard = () => {
  const { leaderboard } = useSelector((state) => state.user);
  const formatAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  return (
    <>
      <section className="my-8">
        <h3 className="mb-4 text-2xl font-semibold text-slate-950 md:text-3xl">
          Top 10 Bidders Leaderboard
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Bidder</th>
                <th className="px-4 py-3 text-left">Bid Expenditure</th>
                <th className="px-4 py-3 text-left">Auctions Won</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {leaderboard.slice(0, 10).map((element, index) => {
                return (
                  <tr key={element._id} className="border-t border-slate-200">
                    <td className="flex items-center gap-3 px-4 py-3">
                      <span className="hidden w-7 text-lg font-semibold text-slate-400 sm:block">
                        {index + 1}
                      </span>
                      <img
                        src={element.profileImage?.url || "/imageHolder.jpg"}
                        alt={element.userName}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                      <span className="font-semibold text-slate-950">
                        {element.userName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">
                      {formatAmount(element.moneySpent)}
                    </td>
                    <td className="px-4 py-3">{element.auctionsWon}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Link
          to={"/leaderboard"}
          className="mt-4 flex w-full justify-center rounded-md border border-slate-300 bg-white py-3 font-semibold text-slate-800 transition duration-200 hover:border-indigo-300 hover:text-indigo-700"
        >
          Go to Leaderboard
        </Link>
      </section>
    </>
  );
};

export default Leaderboard;
