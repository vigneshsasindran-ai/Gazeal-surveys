import React, { useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  eachQuarterOfInterval, eachYearOfInterval, format, subDays, subWeeks,
  subMonths, subQuarters,
} from "date-fns";

/* Collapsible insights section for the admin dashboard. Minimal GA-style. */

const GRANULARITIES = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "quarter", label: "Quarterly" },
  { key: "year", label: "Yearly" },
];

const BUCKETS = {
  day: { start: (n) => startOfDay(n), each: eachDayOfInterval, back: (n) => subDays(n, 29), fmt: "d MMM" },
  week: { start: (n) => startOfWeek(n, { weekStartsOn: 1 }), each: (i) => eachWeekOfInterval(i, { weekStartsOn: 1 }), back: (n) => subWeeks(n, 11), fmt: "d MMM" },
  month: { start: startOfMonth, each: eachMonthOfInterval, back: (n) => subMonths(n, 11), fmt: "MMM yy" },
  quarter: { start: startOfQuarter, each: eachQuarterOfInterval, back: (n) => subQuarters(n, 7), fmt: "QQQ yy" },
  year: { start: startOfYear, each: eachYearOfInterval, back: (n) => startOfYear(new Date(2026, 0, 1)), fmt: "yyyy" },
};

const tooltipStyle = {
  background: "#111114",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  fontFamily: "Outfit, sans-serif",
  fontSize: 12,
  color: "#fff",
};

const axisProps = {
  stroke: "rgba(255,255,255,0.35)",
  tick: { fill: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "Outfit, sans-serif" },
  tickLine: false,
  axisLine: false,
};

const Card = ({ title, children, testid }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" data-testid={testid}>
    <p className="font-outfit text-[12px] font-semibold text-white/60 mb-4">{title}</p>
    {children}
  </div>
);

export const AdminInsights = ({ orders }) => {
  const [open, setOpen] = useState(false);
  const [gran, setGran] = useState("month");

  const series = useMemo(() => {
    const cfg = BUCKETS[gran];
    const now = new Date();
    const dates = orders
      .map((o) => o.stages?.ordered_at)
      .filter(Boolean)
      .map((d) => new Date(d));
    const from = cfg.back(now);
    const buckets = cfg.each({ start: cfg.start(from), end: now });
    const counts = new Map(buckets.map((b) => [b.getTime(), 0]));
    dates.forEach((d) => {
      const k = cfg.start(d).getTime();
      if (counts.has(k)) counts.set(k, counts.get(k) + 1);
    });
    return buckets.map((b) => ({ label: format(b, cfg.fmt), count: counts.get(b.getTime()) || 0 }));
  }, [orders, gran]);

  const byAgency = useMemo(() => {
    const m = new Map();
    orders.forEach((o) => {
      const key = o.agency_name || "Unknown";
      m.set(key, (m.get(key) || 0) + 1);
    });
    return [...m.entries()]
      .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 21) + "…" : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [orders]);

  const byStatus = useMemo(() => {
    const m = { accepted: 0, pending: 0, declined: 0 };
    orders.forEach((o) => { m[o.status] = (m[o.status] || 0) + 1; });
    return [
      { name: "Signed", value: m.accepted, color: "#34d399" },
      { name: "Pending", value: m.pending, color: "#fbbf24" },
      { name: "Declined", value: m.declined, color: "#f87171" },
    ].filter((s) => s.value > 0);
  }, [orders]);

  return (
    <div className="mb-8" data-testid="admin-insights">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-3.5 hover:bg-white/[0.04] transition-colors"
        data-testid="admin-insights-toggle"
      >
        <span className="inline-flex items-center gap-2.5 font-outfit text-[13.5px] font-semibold text-white/80">
          <BarChart3 className="w-4 h-4 text-[#4FB6FF]" /> Insights
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3" data-testid="admin-insights-panel">
          {/* Orders over time */}
          <Card
            testid="chart-orders-over-time"
            title={
              <span className="flex items-center justify-between w-full">Surveys ordered</span>
            }
          >
            <div className="flex gap-1.5 mb-4 -mt-1 flex-wrap">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGran(g.key)}
                  className={`rounded-full px-3 py-1 font-outfit text-[11.5px] font-semibold border transition-all ${
                    gran === g.key
                      ? "border-[#4FB6FF]/60 text-white bg-[#4FB6FF]/10"
                      : "border-white/12 text-white/50 hover:text-white"
                  }`}
                  data-testid={`insights-gran-${g.key}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="count" name="Orders" fill="#4FB6FF" radius={[3, 3, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-3">
            {/* Orders by agency */}
            <Card title="Orders by agency" testid="chart-orders-by-agency">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byAgency} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
                    <XAxis type="number" {...axisProps} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={140} {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Bar dataKey="count" name="Orders" fill="#025eba" radius={[0, 3, 3, 0]} maxBarSize={16}>
                      {byAgency.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#4FB6FF" : "#025eba"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Status split */}
            <Card title="Order status" testid="chart-status-split">
              <div className="h-56 flex items-center">
                <ResponsiveContainer width="55%" height="100%">
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                      {byStatus.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2.5">
                  {byStatus.map((s) => (
                    <p key={s.name} className="flex items-center gap-2.5 font-outfit text-[13px] text-white/75">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {s.name}
                      <span className="text-white font-semibold">{s.value}</span>
                      <span className="text-white/40 text-[11px]">
                        {orders.length ? Math.round((s.value / orders.length) * 100) : 0}%
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInsights;
