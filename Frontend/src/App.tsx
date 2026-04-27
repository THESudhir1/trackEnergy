/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type ReactNode } from "react";
import {
  Zap,
  Battery,
  Wallet,
  RefreshCw,
  History,
  Clock,
  TrendingUp,
  AlertCircle,
  Database,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EnergyLog {
  id: number;
  grid: number;
  dg: number;
  current_balance: number;
  usage_charge: number;
  hours_gap: number;
  syncat: string;
  sync_time: string;
  created_at: string;
}

interface Summary {
  total_grid: number;
  total_dg: number;
  current_balance: number;
  day_charges: number;
  last_sync: string | null;
}

interface HistoryDaily {
  date: string;
  total_grid: number;
  total_dg: number;
  daily_balance: number;
  closing_balance: number;
  opening_balance: number | null;
  daily_charge: number | null;

}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">(
    "dashboard",
  );
  const [logs, setLogs] = useState<EnergyLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<HistoryDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const BASE_URL = "http://localhost:8080";
  const [time, setTime] = useState("");
  const [current_balance, setCurrent_balance] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour12: false,
        }),
      );
    };

    updateTime(); // initial call
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const getEnergyData = async () => {
    try {
      const [logsRes, summaryRes, historyRes] = await Promise.all([
        window.fetch(`${BASE_URL}/api/logs`),
        window.fetch(`${BASE_URL}/api/summary`),
        window.fetch(`${BASE_URL}/api/history`),
      ]);
      const logsData = await logsRes.json();
      const summaryData = await summaryRes.json();
      const historyData = await historyRes.json();
      setLogs(logsData || []);
      setSummary(
        summaryData || {
          total_grid: 0,
          total_dg: 0,
          current_balance: 0,
          last_sync: null,
        },
      );
      setHistory(historyData || []);
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch data from server");
    } finally {
      setLoading(false);
    }
  };

  const syncEnergyData = async () => {
    setRefreshing(true);
    try {
      const res = await window.fetch(`${BASE_URL}/api/fetch`);
      const result = await res.json();
      if (result.success) {
        setCurrent_balance(result.data.balance);
        await getEnergyData();
      } else {
        setError(result.error || "Fetch failed");
      }
    } catch (err) {
      console.error("Sync error:", err);
      setError("Network error triggering fetch");
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getTrend = (current: number, previous?: number) => {
    if (previous == null) return "neutral";
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "neutral";
  };

  useEffect(() => {
    getEnergyData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Initializing Mission Control...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500 selection:text-zinc-950 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-8 space-y-8 flex-shrink-0">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-zinc-950 font-bold text-xl shadow-lg shadow-emerald-500/20">
          U
        </div>
        <nav className="flex flex-col space-y-6">
          <div
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "p-2 rounded-lg cursor-pointer transition-colors",
              activeTab === "dashboard"
                ? "text-emerald-400 bg-zinc-800/50"
                : "text-zinc-600 hover:text-zinc-300",
            )}
          >
            <Zap className="w-6 h-6" />
          </div>
          <div
            onClick={() => setActiveTab("history")}
            className={cn(
              "p-2 rounded-lg cursor-pointer transition-colors",
              activeTab === "history"
                ? "text-emerald-400 bg-zinc-800/50"
                : "text-zinc-600 hover:text-zinc-300",
            )}
          >
            <History className="w-6 h-6" />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Sudhir's Urja Track Dashboard
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              {logs[0]
                ? `MID: ${logs[0].mid} | Flat: ${logs[0].flat_no}`
                : "Waiting for connection..."}
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex flex-col justify-end items-end text-right">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                Current Balance
              </span>
              <span className="text-xs text-emerald-400 flex items-center justify-end font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                {current_balance}
              </span>
            </div>
            <div className="flex flex-col justify-end items-end text-right">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                System Time
              </span>
              <span className="text-xs text-emerald-400 flex items-center justify-end font-medium">
                {/* <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span> */}
                {time}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                System Status
              </span>
              <span className="text-xs text-emerald-400 flex items-center justify-end font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                LIVE • Syncing every 1h
              </span>
            </div>
            <button
              onClick={syncEnergyData}
              disabled={refreshing}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-[10px] text-white rounded font-bold hover:bg-zinc-700 transition-all uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw
                className={cn(
                  "w-3 h-3",
                  refreshing && "animate-spin text-emerald-400",
                )}
              />
              {refreshing ? "Syncing..." : "Manual Sync"}
            </button>
          </div>
        </header>

        <main className="p-8 flex-1 overflow-y-auto space-y-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-medium">{error}</p>
            </motion.div>
          )}
          {activeTab === "dashboard" ? (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Grid Usage */}
                <StatCard
                  title="Main Grid Usage"
                  value={summary?.total_grid?.toFixed(2) ?? "0.00"}
                  unit="kWh"
                  subtitle="Today's total usage"
                  icon={<Zap className="w-5 h-5" />}
                  progress={
                    summary?.total_grid
                      ? Math.min(summary.total_grid * 10, 100)
                      : 0
                  }
                  color="emerald"
                />

                {/* DG Usage */}
                <StatCard
                  title="DG Backup Usage"
                  value={summary?.total_dg?.toFixed(2) ?? "0.00"}
                  unit="kWh"
                  subtitle="Consumption today"
                  icon={<Battery className="w-5 h-5" />}
                  progress={
                    summary?.total_dg ? Math.min(summary.total_dg * 10, 100) : 0
                  }
                  color="amber"
                />

                <StatCard
                  title="Today's Charges"
                  value={`₹${summary?.day_charges?.toFixed(2) ?? "0.00"}`}
                  unit=""
                  subtitle="Energy cost today"
                  icon={<Receipt className="w-5 h-5" />}
                  progress={
                    summary?.day_charges
                      ? Math.min(summary.day_charges * 5, 100)
                      : 0
                  }
                  color="rose"
                />

                {/* Balance */}
                <StatCard
                  title="Current Balance"
                  value={`₹${summary?.current_balance?.toFixed(2) ?? "0.00"}`}
                  unit="" // ❌ no need for split decimal hack
                  subtitle={
                    summary?.last_sync
                      ? `Updated: ${new Date(summary.last_sync).toLocaleString()}`
                      : "No data yet"
                  }
                  icon={<Wallet className="w-5 h-5" />}
                  isHighlighted
                  color="emerald"
                />
              </section>

              <div className="">
                <div className=" bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                        Energy Event Logs
                      </h3>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono uppercase">
                      Last {logs.length} Syncs
                    </span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      {/* Table Head */}
                      <thead>
                        <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/20">
                          <th className="px-6 py-3 font-semibold">Sync Time</th>
                          <th className="px-6 py-3 font-semibold">
                            Device Time
                          </th>
                          <th className="px-6 py-3 font-semibold">
                            Grid (kWh)
                          </th>
                          <th className="px-6 py-3 font-semibold">DG (kWh)</th>
                          <th className="px-6 py-3 font-semibold text-right">
                            Balance
                          </th>
                          <th className="px-6 py-3 font-semibold text-right">
                            Charge (₹)
                          </th>
                          <th className="px-6 py-3 font-semibold text-right">
                            Gap (hrs)
                          </th>
                        </tr>
                      </thead>

                      {/* Table Body */}
                      <tbody className="text-[11px] font-mono divide-y divide-zinc-800/50">
                        <AnimatePresence mode="popLayout">
                          {logs.map((log, index) => {
                            const prev = logs[index + 1];

                            const gridTrend = getTrend(log.grid, prev?.grid);

                            return (
                              <motion.tr
                                key={log.id}
                                className="hover:bg-zinc-800/40 transition-colors group border-b border-zinc-800/30"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                {/* Sync Time */}
                                <td className="px-6 py-4">
                                  <span className="text-zinc-400 group-hover:text-zinc-200">
                                    {formatDate(log.sync_time)}
                                  </span>
                                </td>

                                {/* Device Time */}
                                <td className="px-6 py-4">
                                  <span className="text-zinc-500">
                                    {formatDate(log.syncat)}
                                  </span>
                                </td>

                                {/* Grid */}
                                <td className="px-6 py-4 text-zinc-300 flex items-center gap-1">
                                  {log.grid.toFixed(2)}
                                  {gridTrend === "up" && (
                                    <span className="text-red-500">↑</span>
                                  )}
                                  {gridTrend === "down" && (
                                    <span className="text-green-500">↓</span>
                                  )}
                                </td>

                                {/* DG */}
                                <td className="px-6 py-4">
                                  {log.dg > 0 ? (
                                    <span className="text-amber-500 font-semibold">
                                      {log.dg.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500">0.00</span>
                                  )}
                                </td>

                                {/* Balance */}
                                <td className="px-6 py-4 text-right">
                                  <span
                                    className={cn(
                                      "font-bold",
                                      log.current_balance < 100
                                        ? "text-red-500"
                                        : log.current_balance < 200
                                          ? "text-yellow-400"
                                          : "text-white",
                                    )}
                                  >
                                    ₹{log.current_balance.toFixed(2)}
                                  </span>
                                </td>

                                {/* Usage Charge */}
                                <td className="px-6 py-4 text-right">
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      log.usage_charge > 15
                                        ? "text-red-500"
                                        : log.usage_charge > 8
                                          ? "text-yellow-400"
                                          : "text-green-400",
                                    )}
                                  >
                                    {log.usage_charge !== null
                                      ? log.usage_charge?.toFixed(2)
                                      : "-"}
                                  </span>
                                </td>

                                {/* Hours Gap */}
                                <td className="px-6 py-4 text-right">
                                  <span
                                    className={cn(
                                      "font-semibold",
                                      log.hours_gap > 12
                                        ? "text-red-500"
                                        : log.hours_gap > 6
                                          ? "text-yellow-400"
                                          : "text-green-400",
                                    )}
                                  >
                                    {log.hours_gap !== null
                                      ? log.hours_gap?.toFixed(2)
                                      : "-"}
                                  </span>
                                </td>
                              </motion.tr>
                            );
                          })}

                          {/* Empty State */}
                          {logs.length === 0 && (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-6 py-20 text-center"
                              >
                                <div className="flex flex-col items-center gap-3 opacity-20">
                                  <Database className="w-10 h-10" />
                                  <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                    No sync recordings found
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xl max-w-6xl mx-auto">
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                    Daily Energy History
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono uppercase">
                  Last {history.length} Days
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  {/* Head */}
                  <thead>
                    <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/20">
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Grid (kWh)
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        DG (kWh)
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Opening
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Closing
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Charge (₹)
                      </th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody className="text-[12px] font-mono divide-y divide-zinc-800/50">
                    <AnimatePresence mode="popLayout">
                      {history.map((day, index) => {
                        const prev = history[index + 1];

                        const balanceTrend = getTrend(
                          day.closing_balance,
                          prev?.closing_balance,
                        );

                        return (
                          <motion.tr
                            key={day.date}
                            className="hover:bg-zinc-800/40 transition-colors group border-b border-zinc-800/30"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {/* Date */}
                            <td className="px-6 py-4 text-zinc-400 group-hover:text-zinc-200 font-sans font-medium">
                              {format(new Date(day.date), "MMM dd, yyyy")}
                            </td>

                            {/* Grid */}
                            <td className="px-6 py-4 text-right text-emerald-400">
                              {day.total_grid > 0
                                ? `+${day.total_grid.toFixed(2)}`
                                : "0.00"}
                            </td>

                            {/* DG */}
                            <td className="px-6 py-4 text-right text-amber-400">
                              {day.total_dg > 0
                                ? `+${day.total_dg.toFixed(2)}`
                                : "0.00"}
                            </td>

                            {/* Opening Balance */}
                            <td className="px-6 py-4 text-right text-zinc-400">
                              { day.opening_balance !== null ? day.opening_balance.toFixed(2) : "-"}
                            </td>

                            {/* Closing Balance + Trend */}
                            <td className="px-6 py-4 text-right">
                              <span
                                className={cn(
                                  "font-bold inline-flex items-center gap-1",
                                  day.closing_balance < 100
                                    ? "text-red-500"
                                    : day.closing_balance < 200
                                      ? "text-yellow-400"
                                      : "text-white",
                                )}
                              >
                                { day.closing_balance !== null ? day.closing_balance.toFixed(2) : "-"}
                                {balanceTrend === "up" && (
                                  <span className="text-green-400">↑</span>
                                )}
                                {balanceTrend === "down" && (
                                  <span className="text-red-500">↓</span>
                                )}
                              </span>
                            </td>

                            {/* Daily Charge */}
                            <td className="px-6 py-4 text-right">
                              { day.daily_charge !== null
                                && <span
                                      className={cn(
                                        "font-semibold",
                                        day.daily_charge > 20
                                          ? "text-red-500"
                                          : day.daily_charge > 10
                                            ? "text-yellow-400"
                                            : "text-green-400",
                                      )}
                                    > 
                                { day.daily_charge !== null ? day.daily_charge.toFixed(2) : "-"}
                              </span>
                            }
                            </td>
                          </motion.tr>
                        );
                      })}

                      {/* Empty State */}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-3 opacity-20">
                              <Database className="w-10 h-10" />
                              <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                No history recordings found
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  progress,
  color,
  isHighlighted,
}: {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  icon: ReactNode;
  progress?: number;
  color: "emerald" | "amber";
  isHighlighted?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col justify-between shadow-lg relative group overflow-hidden",
        isHighlighted && "ring-1 ring-emerald-500/30",
      )}
      whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-[0.03] transition-opacity group-hover:opacity-[0.06]",
          color === "emerald" ? "bg-emerald-500" : "bg-amber-500",
        )}
      />

      <div>
        <div className="flex justify-between items-center mb-4">
          <span
            className={cn(
              "text-[10px] uppercase tracking-[0.2em] font-bold",
              isHighlighted
                ? "text-emerald-400"
                : "text-zinc-500 group-hover:text-zinc-400 transition-colors",
            )}
          >
            {title}
          </span>
          <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
            {icon}
          </div>
        </div>
        <h2 className="text-4xl font-bold text-white mt-1 font-mono tracking-tighter">
          {value}
          <span
            className={cn(
              "text-lg font-sans font-medium ml-1",
              color === "emerald" ? "text-emerald-500/80" : "text-amber-500/80",
            )}
          >
            {unit}
          </span>
        </h2>
      </div>

      <div className="mt-6">
        {progress !== undefined ? (
          <>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn(
                  "h-full",
                  color === "emerald" ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
            </div>
            <p className="mt-3 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
              {subtitle}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono">
            <span className="text-zinc-600">Sync Status</span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded ring-1 ring-emerald-500/20">
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
