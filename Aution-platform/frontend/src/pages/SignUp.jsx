import { getSafeRedirectPath } from "@/lib/navigation";
import { register } from "@/store/slices/userSlice";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */
const SignUp = () => {
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIFSCCode, setBankIFSCCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState("");

  const { loading, isAuthenticated } = useSelector((state) => state.user);
  const navigateTo = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const redirectPath = getSafeRedirectPath(location.state?.from);

  useEffect(() => {
    if (isAuthenticated) {
      navigateTo(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigateTo, redirectPath]);

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("userName", userName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("password", password);
    formData.append("address", address);
    formData.append("role", role);
    formData.append("profileImage", profileImage);

    if (role === "Auctioneer") {
      formData.append("bankAccountName", bankAccountName);
      formData.append("bankAccountNumber", bankAccountNumber);
      formData.append("bankIFSCCode", bankIFSCCode);
      formData.append("bankName", bankName);
    }

    const result = await dispatch(register(formData));
    if (result?.success) {
      navigateTo(redirectPath, { replace: true });
    }
  };

  const imageHandler = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setProfileImagePreview(reader.result);
      setProfileImage(file);
    };
  };

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <section className="app-page">
      <div className="app-container-narrow">
        <div className="mb-6">
          <p className="app-kicker">
            Account
          </p>
          <h1 className="app-title">
            Sign Up
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Create a bidder account to compete in auctions, or choose
            auctioneer to list and manage items.
          </p>
        </div>

        <form
          className="grid gap-7 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          onSubmit={handleRegister}
        >
          <section className="grid gap-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Personal Details
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full Name">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Address">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Auctioneer">Auctioneer</option>
                  <option value="Bidder">Bidder</option>
                </select>
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
            </div>
          </section>

          <section className="grid gap-4">
            <h2 className="text-xl font-semibold text-slate-950">
              Profile Image
            </h2>
            <label
              htmlFor="profile-image"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50 sm:flex-row sm:justify-start sm:text-left"
            >
              <img
                src={profileImagePreview || "/imageHolder.jpg"}
                alt="Profile preview"
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <ImagePlus className="mb-2 h-5 w-5 text-indigo-600" />
                <p className="font-semibold text-slate-950">
                  Upload profile image
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  PNG, JPG, JPEG, or WebP
                </p>
              </div>
              <input
                id="profile-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={imageHandler}
                className="hidden"
                required
              />
            </label>
          </section>

          <section className="grid gap-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Payment Method Details
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Required only for auctioneer accounts.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Bank Name">
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                  disabled={role !== "Auctioneer"}
                  required={role === "Auctioneer"}
                >
                  <option value="">Select Your Bank</option>
                  <option value="SBI Bank">SBI Bank</option>
                  <option value="HDFC">HDFC</option>
                  <option value="ICICI">ICICI</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Yes Bank">Yes Bank</option>
                  <option value="PNB">PNB</option>
                  <option value="BOB">BOB</option>
                </select>
              </Field>
              <Field label="IFSC Code">
                <input
                  type="text"
                  value={bankIFSCCode}
                  onChange={(e) => setBankIFSCCode(e.target.value)}
                  className={inputClass}
                  disabled={role !== "Auctioneer"}
                  required={role === "Auctioneer"}
                />
              </Field>
              <Field label="Bank Account Name">
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className={inputClass}
                  disabled={role !== "Auctioneer"}
                  required={role === "Auctioneer"}
                />
              </Field>
              <Field label="Bank Account Number">
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className={inputClass}
                  disabled={role !== "Auctioneer"}
                  required={role === "Auctioneer"}
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-700 hover:text-indigo-800"
              >
                Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};

const Field = ({ label, children }) => (
  <label className="grid gap-2">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    {children}
  </label>
);

export default SignUp;
