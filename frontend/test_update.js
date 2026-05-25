const fetch = require('node-fetch');

async function testUpdate() {
  const url = "http://127.0.0.1:8000/api/v1/campaigns/16";
  const campaignData = {
    title: "Help Rebuild Lives After the Kurla Residential Fire",
    description: "In a heart-wrenching turn of events...",
    category_id: 1,
    subcategory_id: 1,
    city: "Mumbai",
    goal_amount: 550000,
    urgency_level: "CRITICAL",
    cover_image: "test_image",
    deadline: null,
    ai_analysis_data: JSON.stringify({ aiData: {}, docInsights: {} })
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer TEST_TOKEN"
      },
      body: JSON.stringify(campaignData),
      signal: controller.signal
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log(json);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

testUpdate();
