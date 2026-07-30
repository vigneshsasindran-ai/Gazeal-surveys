import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

/*
 * Internal admin panel — /admin
 * Login (single admin credential) + orders dashboard with per-lead process
 * timeline, double-confirmed deletion, and Excel export.
 * noindex enforced via meta tag + robots.txt + X-Robots-Tag on the API.
 */

const API = process.env.REACT_APP_BACKEND_URL;

const fmt = (iso, withTime = true) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  } catch {
    return iso;
  }
};

const STATUS_STYLES = {
  accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  declined: "bg-red-500/15 text-red-300 border-red-500/30",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-outfit text-[11px] font-semibold uppercase tracking-wide ${
      STATUS_STYLES[status] || STATUS_STYLES.pending
    }`}
    data-testid={`status-badge-${status}`}
  >
    {status === "accepted" ? "Signed" : status}
  </span>
);

/* ---------- process timeline (simple visual) ---------- */
const StageDot = ({ done, declined }) => (
  <span
    className={`inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
      declined
        ? "bg-red-500/20 border border-red-400/50"
        : done
        ? ""
        : "border border-white/25"
    }`}
    style={done && !declined ? { background: "linear-gradient(135deg,#4FB6FF,#025eba)" } : {}}
  >
    {declined ? (
      <X className="w-3 h-3 text-red-300" strokeWidth={3} />
    ) : done ? (
      <Check className="w-3 h-3 text-white" strokeWidth={3} />
    ) : (
      <span className="h-1 w-1 rounded-full bg-white/30" />
    )}
  </span>
);

const LeadTimeline = ({ o }) => {
  const s = o.stages || {};
  const declined = o.status === "declined";
  const steps = [
    { label: o.flow === "seller_direct" ? "Seller ordered" : "Agent ordered survey", at: s.ordered_at, done: true },
  ];
  if (o.flow !== "seller_direct") {
    steps.push({ label: "Seller emailed", at: s.seller_invite_sent_at || s.ordered_at, done: true });
  }
  if (declined) {
    steps.push({ label: "Seller declined", at: s.declined_at, declined: true });
  } else {
    if (s.previously_declined_at) {
      steps.push({ label: "Declined, then reconsidered", at: s.reopened_at || s.previously_declined_at, done: true });
    }
    steps.push({ label: "Seller accepted terms", at: s.accepted_at, done: !!s.accepted_at });
  }
  steps.push({
    label: "RPSA emailed",
    at: s.rpsa_instructed_at || (s.accepted_at ? s.accepted_at : null),
    done: !!s.accepted_at,
  });
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-6 sm:items-start" data-testid="lead-timeline">
      {steps.map((st) => (
        <li key={st.label} className="flex items-center gap-2.5">
          <StageDot done={st.done} declined={st.declined} />
          <span>
            <span className={`block font-outfit text-[12.5px] ${st.done || st.declined ? "text-white/90" : "text-white/40"}`}>
              {st.label}
            </span>
            {st.at && <span className="block font-outfit text-[11px] text-white/40">{fmt(st.at)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
};

/* ---------- double-confirm delete modal ---------- */
const DeleteModal = ({ target, step, onCancel, onNext, onConfirm, busy }) => {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0b0b0d] p-6" data-testid="delete-modal">
        {step === 1 ? (
          <>
            <h3 className="font-archivo font-bold text-white text-[18px]">Remove this entry?</h3>
            <p className="font-outfit text-[13.5px] text-white/70 mt-2 leading-relaxed">
              You&apos;re about to remove <span className="text-white font-semibold">{target.seller_name || target.name || "this entry"}</span>
              {target.address ? <> — <span className="text-white font-semibold">{target.address}, {target.postcode}</span></> : null}
              {target.reference ? <> (Ref {target.reference})</> : null}. This also removes its agreement record.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={onCancel} className="rounded-full px-5 py-2.5 font-outfit text-[13px] font-semibold text-white/70 border border-white/20 hover:text-white hover:border-white/40 transition-all" data-testid="delete-cancel">
                Cancel
              </button>
              <button type="button" onClick={onNext} className="rounded-full px-5 py-2.5 font-outfit text-[13px] font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-all" data-testid="delete-confirm-1">
                Yes, remove it
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-archivo font-bold text-red-300 text-[18px]">Final confirmation</h3>
            <p className="font-outfit text-[13.5px] text-white/70 mt-2 leading-relaxed">
              This is permanent and cannot be undone. The lead{target.address ? " and its agreement" : ""} will be deleted from the database. Are you completely sure?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={onCancel} className="rounded-full px-5 py-2.5 font-outfit text-[13px] font-semibold text-white/70 border border-white/20 hover:text-white hover:border-white/40 transition-all" data-testid="delete-cancel-2">
                Keep it
              </button>
              <button type="button" onClick={onConfirm} disabled={busy} className="rounded-full px-5 py-2.5 font-outfit text-[13px] font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-all" data-testid="delete-confirm-2">
                {busy ? "Removing..." : "Delete permanently"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- login ---------- */
const LoginCard = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API}/api/panel/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Login failed");
      onLogin(d.token);
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#025eba" }}>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/[0.08] backdrop-blur-sm p-8" data-testid="admin-login-form">
        <img
          src="https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png"
          alt="Gazeal Surveys"
          className="h-10 w-auto mx-auto"
          data-testid="admin-login-logo"
        />
        <div className="mt-8 space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/25 text-white placeholder-white/50 font-outfit text-[14px] focus:outline-none focus:border-white/60 transition-colors"
            data-testid="admin-login-username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/25 text-white placeholder-white/50 font-outfit text-[14px] focus:outline-none focus:border-white/60 transition-colors"
            data-testid="admin-login-password"
          />
        </div>
        {err && <p className="mt-3 font-outfit text-[12px] text-[#FF8A8A]" data-testid="admin-login-error">{err}</p>}
        <button
          type="submit"
          disabled={busy || !username || !password}
          className="mt-6 w-full rounded-full py-3 font-outfit font-semibold text-[14px] text-[#025eba] bg-white disabled:opacity-50 transition-all hover:opacity-90"
          data-testid="admin-login-submit"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

/* ---------- main page ---------- */
export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem("panel_token"));
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState("orders");
  const [expanded, setExpanded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  const authFetch = async (path, opts = {}) => {
    const res = await fetch(`${API}/api/panel${path}`, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      sessionStorage.removeItem("panel_token");
      setToken(null);
      throw new Error("Session expired");
    }
    return res;
  };

  const load = async () => {
    setLoadErr("");
    try {
      const res = await authFetch("/leads");
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e) {
      if (e.message !== "Session expired") setLoadErr("Couldn't load leads. Try refreshing.");
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const orders = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!q) return true;
      return [o.seller_name, o.seller_email, o.address, o.postcode, o.agent_name, o.agency_name, o.branch, o.reference]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query, statusFilter]);

  const doExport = async () => {
    const res = await authFetch("/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Gazeal_Surveys_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      const res = await authFetch(`/leads/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeleteTarget(null);
      setDeleteStep(1);
      await load();
    } catch {
      setLoadErr("Couldn't delete that entry. Try again.");
      setDeleteTarget(null);
      setDeleteStep(1);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!token) {
    return (
      <LoginCard
        onLogin={(t) => {
          sessionStorage.setItem("panel_token", t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24" data-testid="admin-dashboard">
      {/* Header */}
      <header className="border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-outfit text-[11px] font-semibold tracking-[0.22em] uppercase text-[#4FB6FF]">Gazeal Surveys</p>
            <h1 className="font-archivo font-bold text-white text-[22px]">Admin panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-outfit text-[13px] font-semibold text-white/70 border border-white/20 hover:text-white hover:border-white/40 transition-all" data-testid="admin-refresh">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={doExport} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-outfit text-[13px] font-semibold text-white transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)" }} data-testid="admin-export">
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem("panel_token");
                setToken(null);
              }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-outfit text-[13px] font-semibold text-white/60 hover:text-white transition-colors"
              data-testid="admin-logout"
            >
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 mt-8">
        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              ["Total orders", data.orders.length],
              ["Signed", data.orders.filter((o) => o.status === "accepted").length],
              ["Pending", data.orders.filter((o) => o.status === "pending").length],
              ["Declined", data.orders.filter((o) => o.status === "declined").length],
            ].map(([label, n]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="font-archivo font-bold text-white text-[26px]">{n}</p>
                <p className="font-outfit text-[12px] text-white/50">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs + filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex rounded-full border border-white/15 p-1">
            {["orders", "enquiries"].map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 font-outfit text-[13px] font-semibold capitalize transition-all ${tab === t ? "bg-white text-black" : "text-white/60 hover:text-white"}`} data-testid={`admin-tab-${t}`}>
                {t === "orders" ? "Survey orders" : "Learn-more enquiries"}
              </button>
            ))}
          </div>
          {tab === "orders" && (
            <>
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search seller, address, agent..." className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/5 border border-white/15 text-white placeholder-white/40 font-outfit text-[13px] focus:outline-none focus:border-[#4FB6FF]/60 transition-colors" data-testid="admin-search" />
              </div>
              <div className="flex gap-1.5">
                {["all", "pending", "accepted", "declined"].map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`rounded-full px-3.5 py-1.5 font-outfit text-[12px] font-semibold capitalize border transition-all ${statusFilter === s ? "border-[#4FB6FF]/60 text-white bg-[#4FB6FF]/10" : "border-white/15 text-white/55 hover:text-white"}`} data-testid={`admin-filter-${s}`}>
                    {s === "accepted" ? "Signed" : s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {loadErr && <p className="mb-4 font-outfit text-[13px] text-[#FF8A8A]" data-testid="admin-load-error">{loadErr}</p>}
        {!data && !loadErr && <p className="font-outfit text-white/50 text-[14px]">Loading...</p>}

        {/* Orders list */}
        {data && tab === "orders" && (
          <div className="space-y-3" data-testid="admin-orders-list">
            {orders.length === 0 && <p className="font-outfit text-white/45 text-[14px]">No orders match.</p>}
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden" data-testid={`order-row-${o.reference}`}>
                <button type="button" onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="w-full text-left px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 hover:bg-white/[0.03] transition-colors" data-testid={`order-row-toggle-${o.reference}`}>
                  <span className="font-outfit text-[12px] text-white/45 w-[130px] shrink-0">{fmt(o.stages?.ordered_at)}</span>
                  <span className="font-archivo font-bold text-white text-[14.5px] min-w-[140px]">{o.seller_name || "—"}</span>
                  <span className="font-outfit text-[13px] text-white/65 flex-1 min-w-[180px] truncate">{o.address}{o.postcode ? `, ${o.postcode}` : ""}</span>
                  <span className={`font-outfit text-[11px] font-semibold uppercase tracking-wide ${o.brand === "balgores" ? "text-[#B8AB84]" : "text-[#4FB6FF]"}`}>{o.brand}</span>
                  <StatusBadge status={o.status} />
                  {expanded === o.id ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
                </button>
                {expanded === o.id && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]" data-testid={`order-detail-${o.reference}`}>
                    <div className="mt-4 mb-5">
                      <LeadTimeline o={o} />
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 font-outfit text-[13px]">
                      <p className="text-white/55">Reference <span className="text-white block">{o.reference || "—"}</span></p>
                      <p className="text-white/55">Seller contact <span className="text-white block">{o.seller_email || "—"}{o.seller_phone ? ` · ${o.seller_phone}` : ""}</span></p>
                      <p className="text-white/55">{o.flow === "seller_direct" ? "Branch" : "Agent"} <span className="text-white block">{o.flow === "seller_direct" ? o.branch || "—" : `${o.agent_name || "—"}${o.agency_name ? ` · ${o.agency_name}` : ""}`}</span></p>
                      <p className="text-white/55">Asking price <span className="text-white block">{o.asking_price || "—"}</span></p>
                      <p className="text-white/55">Agent email <span className="text-white block">{o.agent_email || "—"}</span></p>
                      <p className="text-white/55">Listing <span className="text-white block break-all">{o.listing_url || "—"}</span></p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {o.agreement_url && (
                        <a href={o.agreement_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-outfit text-[12.5px] font-semibold text-white/75 border border-white/20 hover:text-white hover:border-white/40 transition-all" data-testid={`order-agreement-link-${o.reference}`}>
                          <ExternalLink className="w-3.5 h-3.5" /> View agreement
                        </a>
                      )}
                      <button type="button" onClick={() => { setDeleteTarget(o); setDeleteStep(1); }} className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-outfit text-[12.5px] font-semibold text-red-300/80 border border-red-400/25 hover:text-red-200 hover:border-red-400/50 transition-all" data-testid={`order-delete-${o.reference}`}>
                        <Trash2 className="w-3.5 h-3.5" /> Remove entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Enquiries */}
        {data && tab === "enquiries" && (
          <div className="space-y-2" data-testid="admin-enquiries-list">
            {data.enquiries.length === 0 && <p className="font-outfit text-white/45 text-[14px]">No enquiries yet.</p>}
            {data.enquiries.map((e) => (
              <div key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="font-outfit text-[12px] text-white/45 w-[130px] shrink-0">{fmt(e.created_at)}</span>
                <span className="font-archivo font-bold text-white text-[14px] min-w-[130px]">{e.name || "—"}</span>
                <span className="font-outfit text-[13px] text-white/65 min-w-[140px]">{e.agency || "—"}</span>
                <span className="font-outfit text-[13px] text-white/65 flex-1">{e.email}</span>
                <button type="button" onClick={() => { setDeleteTarget(e); setDeleteStep(1); }} className="inline-flex items-center gap-1.5 font-outfit text-[12px] font-semibold text-red-300/70 hover:text-red-200 transition-colors" data-testid={`enquiry-delete-${e.id}`}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <DeleteModal
        target={deleteTarget}
        step={deleteStep}
        busy={deleteBusy}
        onCancel={() => { setDeleteTarget(null); setDeleteStep(1); }}
        onNext={() => setDeleteStep(2)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
