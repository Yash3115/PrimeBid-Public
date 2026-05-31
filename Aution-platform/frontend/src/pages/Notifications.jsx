import Spinner from "@/custom-components/Spinner";
import {
  filterNotifications,
  getNotificationMeta,
  notificationFilters,
} from "@/lib/actionInsights";
import { formatDateTime } from "@/lib/format";
import { fetchNotifications, markNotificationsRead } from "@/store/slices/userSlice";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */

const Notifications = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
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

  const filteredNotifications = useMemo(
    () => filterNotifications(notifications, activeFilter),
    [activeFilter, notifications]
  );
  const filterCounts = useMemo(
    () =>
      notificationFilters.reduce((counts, filter) => {
        counts[filter.id] = filterNotifications(notifications, filter.id).length;
        return counts;
      }, {}),
    [notifications]
  );

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
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {unreadNotifications} unread notification
                  {unreadNotifications === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Bid alerts, wallet updates, and delivery handoffs are grouped
                  so the next action is easier to spot.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {notificationFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition ${
                      activeFilter === filter.id
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {filter.label}
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">
                      {filterCounts[filter.id] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {filteredNotifications.length > 0 ? (
              <div className="grid gap-3">
                {filteredNotifications.map((item) => (
                  <NotificationCard key={item._id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">
                  No matching notifications.
                </h2>
                <p className="mt-2 text-slate-600">
                  Try another filter or mark current alerts as read.
                </p>
              </div>
            )}
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

const NotificationCard = ({ item }) => {
  const meta = getNotificationMeta(item);

  return (
    <Link
      to={meta.actionPath}
      className={`rounded-lg border p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 ${
        item.read ? "border-slate-200 bg-white" : "border-indigo-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {!item.read && (
                <Circle className="h-2.5 w-2.5 fill-indigo-600 text-indigo-600" />
              )}
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                {meta.label}
              </span>
              <h2 className="font-semibold text-slate-950">{item.title}</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {item.message}
          </p>
          <span className="mt-3 inline-flex rounded-md bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
            {meta.actionLabel}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default Notifications;
