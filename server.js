/**
 * Verida — Zero-Dependency Local Dev Server (Pure Node.js built-in HTTP)
 * Runs locally without needing any npm packages or internet access.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MAX_BODY_BYTES = 8_500_000;
const MAX_IMAGE_DATA_URL_LENGTH = 8_000_000;
const MAX_CONTEXT_LENGTH = 240;
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

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

const server = http.createServer(async (req, res) => {
  let reqUrl = req.url.split("?")[0];

  if (req.method === "POST" && reqUrl === "/api/analyze-hotel-photo") {
    const chunks = [];
    let bodySize = 0;
    for await (const chunk of req) {
      bodySize += chunk.length;
      if (bodySize > MAX_BODY_BYTES) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ configured: true, analyzed: false, feedback: "The photo is too large. Please choose a smaller image." }));
        return;
      }
      chunks.push(chunk);
    }
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ configured: false, analyzed: false, feedback: "AI image analysis is not configured on this server." }));
        return;
      }
      if (!isImageDataUrl(body.image)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ configured: true, analyzed: false, feedback: "A valid, base64-encoded image is required." }));
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      let aiResponse;
      try {
        aiResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: process.env.VERIDA_VISION_MODEL || "gpt-4.1-mini",
            max_output_tokens: 220,
            input: [{ role: "user", content: [
              { type: "input_text", text: `Review this tourist-submitted hotel/area photo for the selected hotel context. Hotel: ${clipContext(body.hotelName)}. Address: ${clipContext(body.hotelAddress)}. State whether the image appears relevant to the hotel or its surrounding area, note only visible safety-relevant observations, say when something cannot be verified, and return concise feedback for the tourist. Do not identify people or infer private information.`, },
              { type: "input_image", image_url: body.image }
            ] }]
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      const data = await aiResponse.json();
      if (!aiResponse.ok) {
        console.error("[VERIDA HOTEL AI]", data?.error?.message || `AI request failed: ${aiResponse.status}`);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ configured: true, analyzed: false, feedback: "The hotel photo AI provider did not complete the review. Please try again." }));
        return;
      }
      const output = extractOutputText(data);
      if (!output) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ configured: true, analyzed: false, feedback: "The hotel photo AI provider returned no review. Please try again." }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ configured: true, analyzed: true, feedback: output }));
    } catch (error) {
      console.error("[VERIDA HOTEL AI]", error);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ configured: true, analyzed: false, feedback: "Hotel photo AI is temporarily unavailable. Please try again." }));
    }
    return;
  }
  if (reqUrl === "/") reqUrl = "/index.html";

  const filePath = path.join(__dirname, reqUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // Fallback to index.html for SPA routes
        fs.readFile(path.join(__dirname, "index.html"), (fallbackErr, fallbackContent) => {
          if (fallbackErr) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(fallbackContent, "utf-8");
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Verida Tourism Trust App is running at http://localhost:${PORT}\n`);
});
