import { formatDateTime } from "@/lib/format";
import { getUsersList, updateUserStatus } from "@/store/slices/superAdminSlice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const UserManagement = () => {
  const dispatch = useDispatch();
  const { usersList } = useSelector((state) => state.superAdmin);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    dispatch(getUsersList({ search, role }));
  }, [dispatch, role, search]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
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
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">KYC</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {usersList.map((user) => (
              <tr key={user._id}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-950">{user.userName}</p>
                  <p className="text-slate-500">{user.email}</p>
                </td>
                <td className="px-3 py-3">{user.role}</td>
                <td className="px-3 py-3">
                  {user.role === "Auctioneer" ? user.kycStatus || "Not Submitted" : "N/A"}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
