import { formatCurrency, formatDateTime } from "@/lib/format";
import { getUsersList, updateUserStatus } from "@/store/slices/superAdminSlice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const UserManagement = () => {
  const dispatch = useDispatch();
  const { usersList } = useSelector((state) => state.superAdmin);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    dispatch(getUsersList({ search, role, status }));
  }, [dispatch, role, search, status]);

  const pausedUsers = usersList.filter(
    (user) => user.accountStatus === "Paused"
  ).length;
  const totalAvailable = usersList.reduce(
    (total, user) => total + Number(user.wallet?.availableBalance || 0),
    0
  );
  const totalLocked = usersList.reduce(
    (total, user) => total + Number(user.wallet?.lockedBalance || 0),
    0
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <UserSummaryCard label="Visible users" value={usersList.length} />
        <UserSummaryCard label="Paused accounts" value={pausedUsers} />
        <UserSummaryCard
          label="Visible wallet exposure"
          value={`${formatCurrency(totalAvailable)} / ${formatCurrency(totalLocked)}`}
          detail="available / locked"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users"
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All roles</option>
          <option value="Bidder">Bidder</option>
          <option value="Auctioneer">Auctioneer</option>
          <option value="Super Admin">Super Admin</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Paused">Paused</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">KYC</th>
              <th className="px-3 py-3">Wallet</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {usersList.length > 0 ? (
              usersList.map((user) => (
                <tr key={user._id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-950">{user.userName}</p>
                    <p className="text-slate-500">{user.email}</p>
                    {user.phone && (
                      <p className="mt-1 text-xs text-slate-400">{user.phone}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {user.role === "Auctioneer" ? (
                      <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        {user.kycStatus || "Not Submitted"}
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-950">
                      {formatCurrency(user.wallet?.availableBalance || 0)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Locked {formatCurrency(user.wallet?.lockedBalance || 0)}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={user.accountStatus || "Active"}
                      onChange={(event) =>
                        dispatch(updateUserStatus(user._id, event.target.value))
                      }
                      className="rounded-md border border-slate-300 px-2 py-1"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(user.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-3 py-8 text-center text-slate-500">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const UserSummaryCard = ({ label, value, detail }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-2 break-words text-xl font-bold text-slate-950">{value}</p>
    {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
  </div>
);

export default UserManagement;
