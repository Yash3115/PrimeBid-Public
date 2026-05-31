import { googleLogin, login } from "@/store/slices/userSlice";
import { getSafeRedirectPath } from "@/lib/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef(null);
  const { loading, isAuthenticated } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = getSafeRedirectPath(location.state?.from);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          const result = await dispatch(googleLogin({ credential }));
          if (result?.success) {
            navigate(redirectPath, { replace: true });
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: googleButtonRef.current.offsetWidth,
        text: "continue_with",
      });
      setGoogleReady(true);
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [dispatch, navigate, redirectPath]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (result?.success) {
      navigate(redirectPath, { replace: true });
    }
  };

  return (
    <section className="app-page">
      <div className="app-container-narrow grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-300">
              PrimeBid
            </p>
            <h1 className="mt-6 text-5xl font-bold leading-tight">
              Sign in and keep bidding moving.
            </h1>
          </div>
          <div className="grid gap-3">
            {["Track active auctions", "Place bids securely", "Manage your account"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-950">Login</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use your email and password, or continue with a Google account.
            </p>
          </div>

          <form onSubmit={handleLogin} className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Email</span>
              <span className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <Mail className="h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-1 text-slate-950 outline-none"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Password
              </span>
              <span className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <Lock className="h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-1 text-slate-950 outline-none"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </span>
            </label>

            <button
              className="rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              type="submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="min-h-[44px]">
            {googleClientId ? (
              <div
                ref={googleButtonRef}
                className={googleReady ? "w-full" : "h-11 w-full rounded-md border border-slate-200 bg-slate-50"}
              />
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Google login needs `VITE_GOOGLE_CLIENT_ID` in frontend env.
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-slate-600">
            New to PrimeBid?{" "}
            <Link
              to="/sign-up"
              className="font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Login;
