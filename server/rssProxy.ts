// server/rssProxy.ts
import express, { Request, Response } from "express";
import fetch from "node-fetch";

const app = express();

app.get("/api/rss", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (!q) {
    res.status(400).json({ error: "Missing q param" });
    return;
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es&gl=ES&ceid=ES:es`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      res.status(502).json({ error: "Upstream not OK" });
      return;
    }
    const xml = await upstream.text();
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(xml);
  } catch {
    res.status(500).json({ error: "Proxy fetch failed" });
  }
});

export default app;
