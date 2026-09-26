const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
const MAX_CONTEXT_LENGTH = 240;

function isImageDataUrl(value) {
  return typeof value === "string"
    && value.length <= MAX_IMAGE_DATA_URL_LENGTH
    && /^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value);
}

function clipContext(value) {
  return String(value || "").trim().slice(0, MAX_CONTEXT_LENGTH) || "Unknown";
}

function extractOutputText(data) {
  return (data?.output || [])
    .flatMap(item => Array.isArray(item?.content) ? item.content : [])
    .filter(content => content?.type === "output_text" && typeof content.text === "string")
    .map(content => content.text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ configured: false, analyzed: false, feedback: "Method not allowed." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ configured: false, analyzed: false, feedback: "AI image analysis is not configured on this deployment." });
  }

  try {
    const { image, hotelName = "Unknown", hotelAddress = "Unknown" } = req.body || {};
    if (!isImageDataUrl(image)) {
      return res.status(400).json({ configured: true, analyzed: false, feedback: "A valid, base64-encoded image is required." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.VERIDA_VISION_MODEL || "gpt-4.1-mini",
          max_output_tokens: 220,
          input: [{
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Review this tourist-submitted hotel/area photo for the selected hotel context. Hotel: ${clipContext(hotelName)}. Address: ${clipContext(hotelAddress)}. State whether the image appears relevant to the hotel or its surrounding area, note only visible safety-relevant observations, say when something cannot be verified, and return concise feedback for the tourist. Do not identify people or infer private information.`
              },
              { type: "input_image", image_url: image }
            ]
          }]
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    const data = await response.json();
    if (!response.ok) {
      console.error("[VERIDA HOTEL AI]", data?.error?.message || `AI request failed: ${response.status}`);
      return res.status(502).json({ configured: true, analyzed: false, feedback: "The hotel photo AI provider did not complete the review. Please try again." });
    }

    const output = extractOutputText(data);
    if (!output) {
      return res.status(502).json({ configured: true, analyzed: false, feedback: "The hotel photo AI provider returned no review. Please try again." });
    }

    return res.status(200).json({ configured: true, analyzed: true, feedback: output });
  } catch (error) {
    console.error("[VERIDA HOTEL AI]", error);
    return res.status(502).json({ configured: true, analyzed: false, feedback: "Hotel photo AI is temporarily unavailable. Please try again." });
  }
}
