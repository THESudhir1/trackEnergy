// import * as cloudscraper from "cloudscraper";

// interface ServerData {
//   grid: number;
//   dg: number;
//   balance: number;
//   syncat: string;
//   mid: string;
//   flat_no: string;
// }

import axios from "axios";

export async function fetchEnergyData(token: string) {
  try {
    const fullUrl = `https://urjavi.com/qpay?token=${token.trim()}`;

    const res = await axios.get(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const html = res.data;

    // 🔥 Extract SERVER_DATA JSON safely
    const match = html.match(/const SERVER_DATA = ({.*?});/s);

    if (!match) {
      throw new Error("SERVER_DATA not found in HTML");
    }

    const parsed = JSON.parse(match[1]);

    if (!parsed.grid || !parsed.balance) {
      throw new Error("Invalid data received");
    }

    return {
      grid: parseFloat(parsed.grid),
      dg: parseFloat(parsed.dg),
      balance: parseFloat(parsed.balance),
      syncat: parsed.syncat,
      mid: parsed.mid,
      flat_no: parsed.flat_no,
    };
  } catch (err: any) {
    console.error("Fetch Error:", err);
    return null;
  }
}
