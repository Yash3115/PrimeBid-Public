import { ArrowLeft, Home, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <section className="app-page">
      <div className="app-container-narrow">
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm md:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
            <Search className="h-7 w-7" />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
            Page not found
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 md:text-4xl">
            This PrimeBid page does not exist.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
            The link may be outdated, the route may have moved, or the auction
            may no longer be available.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
            <Link to="/auctions" className="btn-primary">
              <Home className="h-4 w-4" />
              Browse Auctions
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
