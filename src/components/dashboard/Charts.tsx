// src/components/dashboard/Charts.tsx

"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── Color palette ────────────────────────────────────────────────────────────

const CHART_COLORS = {
  blue: "#2563eb",
  blueLight: "#93c5fd",
  green: "#10b981",
  greenLight: "#6ee7b7",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  red: "#ef4444",
  slate: "#64748b",
  teal: "#14b8a6",
  pink: "#ec4899",
};

const PIE_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.orange,
  CHART_COLORS.purple,
  CHART_COLORS.teal,
  CHART_COLORS.pink,
  CHART_COLORS.red,
  CHART_COLORS.slate,
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      {label && (
        <p className="font-semibold text-slate-700 mb-2 border-b border-slate-100 pb-1">
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-500 capitalize">
            {entry.name.replace(/_/g, " ")}:
          </span>
          <span className="font-semibold text-slate-800">
            {prefix}
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend Indicator ──────────────────────────────────────────────────────────

function TrendIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0)
    return <span className="text-slate-400 text-xs">No data</span>;

  const pct =
    previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);

  if (pct > 0) {
    return (
      <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
        <TrendingUp className="h-3 w-3" />+{pct}%
      </span>
    );
  }
  if (pct < 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-500 text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        {pct}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-slate-400 text-xs">
      <Minus className="h-3 w-3" />
      No change
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  );
}

// ─── 1. Patient Registration Trend ───────────────────────────────────────────

interface PatientTrendData {
  month: string;
  patients: number;
}

interface PatientTrendChartProps {
  data: PatientTrendData[];
  isLoading?: boolean;
}

export function PatientTrendChart({ data, isLoading }: PatientTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Patient Registration Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  const current = data[data.length - 1]?.patients ?? 0;
  const previous = data[data.length - 2]?.patients ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Patient Registration Trend
          </CardTitle>
          <TrendIndicator current={current} previous={previous} />
        </div>
        <p className="text-xs text-slate-400">Last 6 months</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={CHART_COLORS.blue}
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_COLORS.blue}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="patients"
              stroke={CHART_COLORS.blue}
              strokeWidth={2.5}
              fill="url(#patientGrad)"
              dot={{
                fill: CHART_COLORS.blue,
                strokeWidth: 2,
                r: 4,
                stroke: "#fff",
              }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── 2. Appointment Trend ─────────────────────────────────────────────────────

interface AppointmentTrendData {
  week: string;
  appointments: number;
}

interface AppointmentTrendChartProps {
  data: AppointmentTrendData[];
  isLoading?: boolean;
}

export function AppointmentTrendChart({
  data,
  isLoading,
}: AppointmentTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Appointment Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  const current = data[data.length - 1]?.appointments ?? 0;
  const previous = data[data.length - 2]?.appointments ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Appointment Volume
          </CardTitle>
          <TrendIndicator current={current} previous={previous} />
        </div>
        <p className="text-xs text-slate-400">Last 6 weeks</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="appointments"
              fill={CHART_COLORS.green}
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── 3. Record Type Distribution (Pie) ────────────────────────────────────────

interface RecordTypeData {
  type: string;
  count: number;
}

interface RecordTypeChartProps {
  data: RecordTypeData[];
  isLoading?: boolean;
}

export function RecordTypeChart({ data, isLoading }: RecordTypeChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Record Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Record Types Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
            No records yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Record Types Distribution
        </CardTitle>
        <p className="text-xs text-slate-400">All medical record types</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="55%" height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                dataKey="count"
                nameKey="type"
                paddingAngle={3}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 text-xs">
                      <p className="font-semibold text-slate-700">{d.name}</p>
                      <p className="text-slate-500">
                        Count:{" "}
                        <span className="font-bold text-slate-800">
                          {d.value}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {data.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="text-xs text-slate-600 truncate flex-1">
                  {item.type}
                </span>
                <span className="text-xs font-semibold text-slate-700 flex-shrink-0">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 4. Revenue Trend ─────────────────────────────────────────────────────────

interface RevenueTrendData {
  month: string;
  revenue: number;
  paid: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
  isLoading?: boolean;
}

export function RevenueTrendChart({ data, isLoading }: RevenueTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  const current = data[data.length - 1]?.paid ?? 0;
  const previous = data[data.length - 2]?.paid ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Revenue Trend (₦)
          </CardTitle>
          <TrendIndicator current={current} previous={previous} />
        </div>
        <p className="text-xs text-slate-400">
          Billed vs Collected — last 6 months
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={CHART_COLORS.purple}
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_COLORS.purple}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={CHART_COLORS.green}
                  stopOpacity={0.15}
                />
                <stop
                  offset="95%"
                  stopColor={CHART_COLORS.green}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`
              }
            />
            <Tooltip content={<CustomTooltip prefix="₦" />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Billed"
              stroke={CHART_COLORS.purple}
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="paid"
              name="Collected"
              stroke={CHART_COLORS.green}
              strokeWidth={2.5}
              fill="url(#paidGrad)"
              dot={{
                fill: CHART_COLORS.green,
                strokeWidth: 2,
                r: 3,
                stroke: "#fff",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── 5. Appointment Status Distribution ──────────────────────────────────────

interface ApptStatusData {
  status: string;
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: CHART_COLORS.blue,
  CONFIRMED: CHART_COLORS.teal,
  "IN PROGRESS": CHART_COLORS.orange,
  COMPLETED: CHART_COLORS.green,
  CANCELLED: CHART_COLORS.red,
  "NO SHOW": CHART_COLORS.slate,
};

export function AppointmentStatusChart({
  data,
  isLoading,
}: {
  data: ApptStatusData[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Appointment Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Appointment Status Breakdown
        </CardTitle>
        <p className="text-xs text-slate-400">All time</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="status"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    STATUS_COLORS[entry.status.toUpperCase()] ??
                    PIE_COLORS[i % PIE_COLORS.length]
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
