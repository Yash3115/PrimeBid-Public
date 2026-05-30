import emailjs from "@emailjs/browser";
import { Mail, MessageSquare, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

const Contact = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleContactForm = (e) => {
    e.preventDefault();
    setLoading(true);

    emailjs
      .send("service_7fi3blx", "template_uoz4u0q", form, "vu8NQbdo_al3pcY5t")
      .then(() => {
        toast.success("Thank you. Your message has been sent.");
        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      })
      .catch(() => {
        toast.error("Failed to send message.");
      })
      .finally(() => setLoading(false));
  };

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <section className="app-page">
      <div className="app-container grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="app-kicker">
            Contact
          </p>
          <h1 className="mt-4 text-4xl font-bold text-slate-950">
            Need help with an auction?
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Send details about the listing, bid, wallet, payout, or account issue
            and the PrimeBid team can review it.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              [Mail, "Use the email linked to your account"],
              [Phone, "Include a reachable phone number"],
              [MessageSquare, "Add listing or payment context"],
            ].map(([Icon, text]) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700"
              >
                <Icon className="h-5 w-5 text-indigo-600" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <form
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          onSubmit={handleContactForm}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Your Name
              </span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={`${inputClass} pl-11`}
                  required
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Your Email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`${inputClass} pl-11`}
                  required
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Your Phone
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">
                Subject
              </span>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => updateField("subject", e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Message
              </span>
              <textarea
                rows={8}
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                className={`${inputClass} resize-y`}
                required
              />
            </label>
          </div>

          <button
            className="mt-6 w-full rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
