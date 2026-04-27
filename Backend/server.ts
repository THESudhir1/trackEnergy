import "dotenv/config";
import cors from "cors";
import express from "express";
import { fetchEnergyData } from "./services/scraper.js";
import { supabase } from "./utils/supabase";
import dns from "node:dns";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 8080; // better to use 5000 for backend

  app.use(cors());
  app.use(express.json());

  // =========================
  // GET /fetch health
  // =========================
  app.get("/api/health", async (req, res) => {
    try {
      // 1. Perform a tiny query to verify connection
      // We select a single row from any table, or just a dummy count
      const {
        data,
        error,
        status: pgStatus,
      } = await supabase
        .from("energy_logs") // Use one of your actual table names here
        .select("id")
        .limit(1);

      if (error) throw error;

      res.status(200).json({
        status: "UP",
        database: "SUPABASE_CONNECTED",
        backend: "Backend_up",
        statusCode: pgStatus, // Usually 200 or 206
        time: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({
        status: "DOWN",
        database: "CONNECTION_FAILED",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // =========================
  // GET /fetch-data
  // =========================
  app.get("/api/fetch-data", async (req, res) => {
    const secret = req.query.secret;

    // 1. Security check
    if (secret !== process.env.CRON_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const token = process.env.URJAVI_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "URJAVI_TOKEN not configured" });
    }

    // ✅ 2. Respond immediately (IMPORTANT for cron reliability)
    res.status(200).json({ success: true, message: "Cron triggered" });

    // ✅ 3. Run actual job in background
    setImmediate(async () => {
      try {
        console.log("Cron job started...");

        const data = await fetchEnergyData(token);

        if (!data) {
          console.error("No data received from fetchEnergyData");
          return;
        }

        // ✅ Better timestamp (ISO → DB safe)
        const arrivalTime = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");

        // ✅ 4. Insert into Supabase
        const { error: dbError } = await supabase.from("energy_logs").upsert(
          {
            mid: data.mid,
            flat_no: data.flat_no,
            grid: data.grid,
            dg: data.dg,
            balance: data.balance,
            syncat: data.syncat,
            sync_time: arrivalTime,
          },
          {
            onConflict: "mid, syncat",
            ignoreDuplicates: true,
          },
        );

        if (dbError) {
          console.error("DB Error:", dbError.message);
          return;
        }

        console.log("Cron job completed successfully");
      } catch (error) {
        console.error("Cron execution error:", error);
      }
    });
  });

  app.get("/api/fetch", async (req, res) => {
    const token = process.env.URJAVI_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "URJAVI_TOKEN not configured",
      });
    }

    try {
      const { address } = await dns.promises.lookup("https://urjavi.com");
      console.log(`✅ DNS Resolved: ${address}`);
    } catch (e) {
      console.error(
        "❌ DNS Lookup failed. The domain cannot be found from this network.",
        e,
      );
    }

    try {
      const data = await fetchEnergyData(token);

      if (!data) {
        return res.status(500).json({
          error: "Failed to extract data",
        });
      }

      // Standardized ISO-like local timestamp
      const arrivalTime = new Date()
        .toLocaleString("sv-SE", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(",", "");

      // Supabase Insert/Upsert logic
      const { data: upsertData, error: dbError } = await supabase
        .from("energy_logs")
        .upsert(
          {
            mid: data.mid,
            flat_no: data.flat_no,
            grid: data.grid,
            dg: data.dg,
            balance: data.balance,
            syncat: data.syncat, // Meter's timestamp
            sync_time: arrivalTime, // Server's timestamp (Full date/time)
          },
          {
            onConflict: "mid, syncat", // Matches your Postgres UNIQUE constraint
            ignoreDuplicates: true, // Acts like "INSERT OR IGNORE"
          },
        )
        .select(); // We select back the result to see if an insert happened

      if (dbError) {
        return res.status(500).json({
          error: "Database operation failed",
          details: dbError.message,
        });
      }

      // In Supabase, if ignoreDuplicates is true and it's a duplicate,
      // the returned data array will be empty.
      const wasInserted = upsertData && upsertData.length > 0;

      res.json({
        success: true,
        data,
        inserted: wasInserted,
        message: wasInserted
          ? "Data saved successfully to Supabase"
          : "Duplicate entry found, skipped saving",
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // =========================
  // GET /logs
  // =========================
  app.get("/api/logs", async (req, res) => {
    try {
      const { data: logs, error } = await supabase.rpc(
        "get_energy_logs_with_usage",
      );
      if (error) throw error;
      res.json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // =========================
  // GET /summary
  // =========================
  app.get("/api/summary", async (req, res) => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Call the optimized Supabase RPC function
      const { data: summaryData, error } = await supabase.rpc(
        "get_daily_summary",
        { target_date: today },
      );

      if (error) throw error;

      // If no data exists for today (array is empty)
      if (!summaryData || summaryData.length === 0) {
        return res.json({
          total_grid: 0,
          total_dg: 0,
          current_balance: 0,
          day_charges: 0,
          last_sync: null,
        });
      }

      // Supabase returns an array, so we grab the first meter's data
      const summary = summaryData[0];

      res.json({
        total_grid: summary.grid_used,
        total_dg: summary.dg_used,
        current_balance: summary.current_balance,
        day_charges: summary.day_charges,
        last_sync: summary.last_sync,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  // =========================
  // GET /history
  // =========================
  app.get("/api/history", async (req, res) => {
    try {
      // Call the Supabase function, passing 30 as the limit
      const { data: history, error } = await supabase.rpc(
        "get_energy_history",
        { limit_count: 30 },
      );

      if (error) {
        throw error;
      }

      // Supabase returns an empty array [] if no records exist,
      // which is perfectly safe to send directly to React.
      res.json(history || []);
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({
        error: "Failed to fetch history",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // =========================
  // START SERVER
  // =========================
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
