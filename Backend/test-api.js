import axios from "axios";

async function testUrl() {
  try {
    const token = "FmulWbFAGZLpjkYG4YlWsQ";

    const rawUrl = process.env.URJAVI_URL || "urjavi.com";

    const cleanBaseUrl = rawUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    const fullUrl = `https://${cleanBaseUrl}/qpay?token=${token}`;

    console.log("Testing URL:", fullUrl);

    const res = await axios.get(fullUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 10000
    });

    console.log("Status:", res.status);
    console.log("Length:", res.data.length);
    console.log("Preview:\n", res.data);

  } catch (err) {   // ✅ fixed
    console.error("❌ Error:");
    console.error(err.message);

    if (err.code) console.error("Code:", err.code);
    if (err.response) console.error("Status:", err.response.status);
  }
}

testUrl();