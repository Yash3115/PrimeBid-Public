import { logout } from "@/store/slices/userSlice";
import { LogOut, ShieldCheck } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const Logout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, isAuthenticated, user } = useSelector((state) => state.user);

  const handleLogout = async () => {
    const result = await dispatch(logout());
    if (result?.success) {
      navigate("/login");
    }
  };

  return (
    <section className="app-page">
      <div className="mx-auto flex min-h-[620px] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
            <LogOut className="h-7 w-7" />
          </span>
          <h1 className="mt-6 text-3xl font-bold text-slate-950">
            Log out of PrimeBid?
          </h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">
            {isAuthenticated
              ? `You are signed in${user?.userName ? ` as ${user.userName}` : ""}.`
              : "You are already logged out."}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {loading ? "Logging out..." : "Logout"}
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition duration-200 hover:bg-indigo-700"
              >
                Login
              </Link>
            )}
            <Link
              to="/"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition duration-200 hover:border-indigo-300 hover:text-indigo-700"
            >
              Stay on PrimeBid
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Your session cookie is cleared on logout.
          </div>
        </div>
      </div>
    </section>
  );
};

export default Logout;
