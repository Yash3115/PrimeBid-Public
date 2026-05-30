import Spinner from "@/custom-components/Spinner";
import { formatDateTime } from "@/lib/format";
import { fetchNotifications, markNotificationsRead } from "@/store/slices/userSlice";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const Notifications = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const { authChecked, isAuthenticated, notifications, unreadNotifications } =
    useSelector((state) => state.user);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      navigateTo("/");
      return;
    }
    dispatch(fetchNotifications());
  }, [authChecked, dispatch, isAuthenticated, navigateTo]);

  return (
    <section className="app-page">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="app-kicker">
              Activity
            </p>
            <h1 className="app-title">
              Notifications
            </h1>
          </div>
          <button
            type="button"
            onClick={() => dispatch(markNotificationsRead())}
            disabled={!unreadNotifications}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            <CheckCheck className="h-4 w-4" />
            Mark Read
          </button>
        </div>

        {!authChecked ? (
          <Spinner />
        ) : notifications.length > 0 ? (
          <div className="grid gap-3">
            {notifications.map((item) => (
              <Link
                key={item._id}
                to={
                  item.actionPath ||
                  (item.auction?._id ? `/auction/item/${item.auction._id}` : "#")
                }
                className={`rounded-lg border p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 ${
                  item.read
                    ? "border-slate-200 bg-white"
                    : "border-indigo-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-slate-950">
                        {item.title}
                      </h2>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.message}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              No notifications yet.
            </h2>
            <p className="mt-2 text-slate-600">
              Outbid alerts, reminders, and win updates will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Notifications;
