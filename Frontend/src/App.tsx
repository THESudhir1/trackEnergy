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

interface EnergyApiResponse {
  grid: number;
  dg: number;
  balance: number;
  syncat: string;
  mid: string;
  flat_no: string;
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
  const BASE_URL = "https://trackenergy.onrender.com";
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

  const getTrend = (current: number, previous?: number) => {
    if (previous == null) return "neutral";
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "neutral";
  };

  useEffect(() => {
    (syncEnergyData(), getEnergyData());
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
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500 selection:text-zinc-950 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Converts to Bottom Nav on Mobile */}
      <aside className="w-full h-16 md:w-20 md:h-screen bg-zinc-900 border-t md:border-t-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center py-0 md:py-8 space-y-0 md:space-y-8 flex-shrink-0 fixed bottom-0 md:relative z-50 justify-around md:justify-start">
        <div className="hidden md:flex w-10 h-10 bg-emerald-500 rounded-lg items-center justify-center text-zinc-950 font-bold text-xl shadow-lg shadow-emerald-500/20">
          U
        </div>
        <nav className="flex flex-row md:flex-col space-x-8 md:space-x-0 md:space-y-6">
          <div
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "p-3 md:p-2 rounded-lg cursor-pointer transition-colors",
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
              "p-3 md:p-2 rounded-lg cursor-pointer transition-colors",
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
      <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Header - Stacks on Mobile */}
        <header className="min-h-20 h-auto md:h-20 px-4 md:px-8 py-4 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
          <div className="text-center md:text-left w-full md:w-auto">
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Sudhir's Urja Track Dashboard
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
              {logs[0] ? "MID: 71414 | Flat: 203" : "Waiting for connection..."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 md:gap-6 w-full md:w-auto">
            <div className="flex flex-col justify-center items-center md:items-end text-center md:text-right">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                Balance
              </span>
              <span className="text-xs text-emerald-400 flex items-center font-medium">
                {current_balance}
              </span>
            </div>

            <div className="hidden sm:flex flex-col justify-center items-center md:items-end text-center md:text-right">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                System Time
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {time}
              </span>
            </div>

            <div className="hidden lg:flex flex-col text-right">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                System Status
              </span>
              <span className="text-xs text-emerald-400 flex items-center justify-end font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                LIVE
              </span>
            </div>

            <button
              onClick={syncEnergyData}
              disabled={refreshing}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-[9px] md:text-[10px] text-white rounded font-bold hover:bg-zinc-700 transition-all uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw
                className={cn(
                  "w-3 h-3",
                  refreshing && "animate-spin text-emerald-400",
                )}
              />
              <span className="whitespace-nowrap">
                {refreshing ? "Syncing..." : "Sync"}
              </span>
            </button>
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 md:space-y-8">
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
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                  title="Main Grid"
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

                <StatCard
                  title="DG Backup"
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
                  color="amber"
                />

                <StatCard
                  title="Current Balance"
                  value={`₹${current_balance ?? "0.00"}`}
                  unit=""
                  subtitle={
                    summary?.last_sync
                      ? `Sync: ${format(new Date(summary.last_sync), "HH:mm")}`
                      : "No data"
                  }
                  icon={<Wallet className="w-5 h-5" />}
                  isHighlighted
                  color="emerald"
                />
              </section>

              <div className="pb-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
                  <div className="px-4 md:px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest">
                        Energy Event Logs
                      </h3>
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/20">
                          <th className="px-4 md:px-6 py-3 font-semibold">
                            Sync Time
                          </th>
                          <th className="px-6 py-3 font-semibold">
                            Device Time
                          </th>
                          <th className="px-4 md:px-6 py-3 font-semibold">
                            Grid (kWh)
                          </th>
                          <th className="px-4 md:px-6 py-3 font-semibold">
                            DG (kWh)
                          </th>
                          <th className="px-4 md:px-6 py-3 font-semibold text-right">
                            Balance
                          </th>
                          <th className="px-4 md:px-6 py-3 font-semibold text-right">
                            Charge (₹)
                          </th>
                        </tr>
                      </thead>

                      <tbody className="text-[11px] font-mono divide-y divide-zinc-800/50">
                        <AnimatePresence mode="popLayout">
                          {logs.map((log, index) => {
                            const prev = logs[index + 1];
                            const gridTrend = getTrend(log.grid, prev?.grid);

                            return (
                              <motion.tr
                                key={log.id}
                                className="hover:bg-zinc-800/40 transition-colors group"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <td className="px-4 md:px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-zinc-300">
                                      {format(
                                        new Date(log.syncat),
                                        "HH:mm:ss",
                                      )}
                                    </span>
                                    <span className="text-[9px] text-zinc-600">
                                      {format(
                                        new Date(log.syncat),
                                        "MMM dd",
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-zinc-300">
                                      {format(
                                        new Date(log.sync_time),
                                        "HH:mm:ss",
                                      )}
                                    </span>
                                    <span className="text-[9px] text-zinc-600">
                                      {format(
                                        new Date(log.sync_time),
                                        "MMM dd",
                                      )}
                                    </span>
                                  </div>
                                </td>
                                
                                <td className="px-4 md:px-6 py-4 text-zinc-300">
                                  {log.grid.toFixed(2)}
                                  {gridTrend === "up" && (
                                    <span className="text-red-500 ml-1">↑</span>
                                  )}
                                  {gridTrend === "down" && (
                                    <span className="text-green-500 ml-1">
                                      ↓
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 md:px-6 py-4">
                                  <span
                                    className={
                                      log.dg > 0
                                        ? "text-amber-500"
                                        : "text-zinc-500"
                                    }
                                  >
                                    {log.dg.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 text-right">
                                  <span
                                    className={cn(
                                      "font-bold",
                                      log.current_balance < 200
                                        ? "text-red-500"
                                        : "text-white",
                                    )}
                                  >
                                    ₹{log.current_balance.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 md:px-6 py-4 text-right">
                                  <span className="text-green-400">
                                    {log.usage_charge?.toFixed(2) ?? "-"}
                                  </span>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                    Daily History
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 bg-zinc-950/20">
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Grid
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">DG</th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Closing
                      </th>
                      <th className="px-6 py-4 font-semibold text-right">
                        Daily Charge
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] font-mono divide-y divide-zinc-800/50">
                    {history.map((day) => (
                      <tr key={day.date} className="hover:bg-zinc-800/40">
                        <td className="px-6 py-4 text-zinc-400">
                          {format(new Date(day.date), "MMM dd, yyyy")}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-400">
                          +{day.total_grid.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-amber-400">
                          +{day.total_dg.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-bold">
                          ₹{day.closing_balance.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-green-400">
                          ₹{day.daily_charge?.toFixed(2) ?? "-"}
                        </td>
                      </tr>
                    ))}
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
        "bg-zinc-900 border border-zinc-800 p-4 md:p-6 rounded-xl flex flex-col justify-between shadow-lg relative group overflow-hidden",
        isHighlighted && "ring-1 ring-emerald-500/30",
      )}
      whileHover={{ y: -4 }}
    >
      <div className="flex justify-between items-center mb-2">
        <span
          className={cn(
            "text-[9px] uppercase tracking-widest font-bold",
            isHighlighted ? "text-emerald-400" : "text-zinc-500",
          )}
        >
          {title}
        </span>
        <div className="text-zinc-600">{icon}</div>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white font-mono">
        {value}
        <span className="text-sm ml-1 opacity-50">{unit}</span>
      </h2>
      <p className="mt-4 text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
        {subtitle}
      </p>
    </motion.div>
  );
}
