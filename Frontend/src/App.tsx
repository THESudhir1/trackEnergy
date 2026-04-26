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
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
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
  last_sync: string | null;
}

interface HistoryDaily {
  date: string;
  total_grid: number;
  total_dg: number;
  daily_balance: number;
  closing_balance: number;
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
              {/* Stats Grid */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Main Grid Usage"
                  value={summary?.total_grid?.toFixed(2) || "0.00"}
                  unit="kWh"
                  subtitle="Today's total usage"
                  icon={<Zap className="w-5 h-5" />}
                  progress={65}
                  color="emerald"
                />
                <StatCard
                  title="DG Backup Usage"
                  value={summary?.total_dg?.toFixed(2) || "0.00"}
                  unit="kWh"
                  subtitle="Consumption today"
                  icon={<Battery className="w-5 h-5" />}
                  progress={12}
                  color="amber"
                />
                <StatCard
                  title="Current Balance"
                  value={`₹${summary?.current_balance?.toFixed(0) || "0"}`}
                  unit={
                    summary?.current_balance != null
                      ? `.${summary.current_balance.toFixed(2).split(".")[1]}`
                      : ".00"
                  }
                  subtitle={
                    summary?.last_sync
                      ? `Last sync: ${summary.last_sync}`
                      : "No data yet"
                  }
                  icon={<Wallet className="w-5 h-5" />}
                  isHighlighted
                  color="emerald"
                />
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Logs Table */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
                  <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                        Energy Event Logs
                      </h3>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono uppercase">
                      Last 100 Syncs
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/20">
                          <th className="px-6 py-3 font-semibold">Sync Time</th>
                          <th className="px-6 py-3 font-semibold">
                            Sync Time From Urjavi
                          </th>
                          <th className="px-6 py-3 font-semibold">
                            Grid (kWh)
                          </th>
                          <th className="px-6 py-3 font-semibold">DG (kWh)</th>
                          <th className="px-6 py-3 font-semibold text-right">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] font-mono divide-y divide-zinc-800/50">
                        <AnimatePresence mode="popLayout">
                          {logs.map((log) => (
                            <motion.tr
                              key={log.id}
                              className="hover:bg-zinc-800/40 transition-colors group border-b border-zinc-800/30"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <td className="px-6 py-4">
                                <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                  {log.sync_time}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                                  {log.syncat}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-zinc-300">
                                {log.grid.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-zinc-300">
                                {log.dg > 0 ? (
                                  <span className="text-amber-500/80">
                                    {log.dg.toFixed(2)}
                                  </span>
                                ) : (
                                  log.dg.toFixed(2)
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span
                                  className={cn(
                                    "font-bold",
                                    log.current_balance < 100
                                      ? "text-red-500"
                                      : "text-white",
                                  )}
                                >
                                  ₹{log.current_balance?.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span
                                  className={cn(
                                    "font-bold",
                                    log.usage_charge > 10
                                      ? "text-red-500"
                                      : "text-white",
                                  )}
                                >
                                  ₹{log.usage_charge?.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span
                                  className={cn("font-bold", "text-red-500")}
                                >
                                  ₹{log.hours_gap?.toFixed(2)}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                          {logs.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
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

                {/* Daily Summary / Insights */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl h-fit">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-zinc-800 pb-4 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Daily Summary
                  </h3>
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between text-[11px] mb-2 font-mono">
                        <span className="text-zinc-500 uppercase">
                          Total Grid Today
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {summary?.total_grid?.toFixed(2) || "0.00"} kWh
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (summary?.total_grid || 0) * 5)}%`,
                          }}
                          className="h-full bg-emerald-500/60"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-2 font-mono">
                        <span className="text-zinc-500 uppercase">
                          Total DG Today
                        </span>
                        <span className="text-amber-400 font-bold">
                          {summary?.total_dg?.toFixed(2) || "0.00"} kWh
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (summary?.total_dg || 0) * 10)}%`,
                          }}
                          className="h-full bg-amber-500/60"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 space-y-4">
                        <div>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-2">
                            Efficiency Insight
                          </p>
                          <p className="text-[11px] leading-relaxed text-zinc-400">
                            Today,{" "}
                            <span className="text-emerald-400 font-bold">
                              {summary &&
                              summary.total_grid + summary.total_dg > 0
                                ? (
                                    (summary.total_grid /
                                      (summary.total_grid + summary.total_dg)) *
                                    100
                                  ).toFixed(1)
                                : "0"}
                              %
                            </span>{" "}
                            of your energy consumption was sourced via the
                            primary grid.
                          </p>
                        </div>
                        {summary?.current_balance &&
                          summary.current_balance < 200 && (
                            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-[10px] font-bold text-red-500 uppercase">
                                Low Balance Alert
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xl max-w-4xl mx-auto">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                    Daily History Usage
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono uppercase">
                  Last 30 Days
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/20">
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Grid Usage (kWh)
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        DG Usage (kWh)
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Closing Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] font-mono divide-y divide-zinc-800/50">
                    <AnimatePresence mode="popLayout">
                      {history.map((day) => (
                        <motion.tr
                          key={day.date}
                          className="hover:bg-zinc-800/40 transition-colors group border-b border-zinc-800/30"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <td className="px-6 py-4 text-zinc-400 group-hover:text-zinc-200 transition-colors font-sans font-medium">
                            {format(new Date(day.date), "MMM dd, yyyy")}
                          </td>
                          <td className="px-6 py-4 text-emerald-500/80 text-right">
                            {day.total_grid > 0
                              ? `+${day.total_grid.toFixed(2)}`
                              : "0.00"}
                          </td>
                          <td className="px-6 py-4 text-amber-500/80 text-right">
                            {day.total_dg > 0
                              ? `+${day.total_dg.toFixed(2)}`
                              : "0.00"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={cn(
                                "font-bold",
                                day.closing_balance < 100
                                  ? "text-red-500"
                                  : "text-white",
                              )}
                            >
                              ₹{day.closing_balance.toFixed(2)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-20 text-center">
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
