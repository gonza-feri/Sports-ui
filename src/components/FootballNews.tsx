// src/components/FootballNews.tsx
import React, { useEffect, useState } from "react";
import "./FootballNews.css";

type NewsArticle = {
  source?: { id?: string | null; name?: string | null };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

export default function FootballNews() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const NEWSAPI_KEY = "6866d2f9cd2b482da43ecda2e5fdf898"; 

  useEffect(() => {
    let cancelled = false;
    async function loadNews() {
      try {
        setLoading(true);
        setError(null);

        if (!NEWSAPI_KEY) {
          setError("No API key is configured for news.");
          setArticles([]);
          return;
        }

        const url = `https://newsapi.org/v2/everything?q=fútbol&language=en&sortBy=publishedAt&pageSize=12&apiKey=${NEWSAPI_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`News fetch failed: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (cancelled) return;

        const items: NewsArticle[] = Array.isArray(data.articles) ? data.articles : [];
        setArticles(items);
      } catch (err) {
        console.error("load news failed", err);
        if (!cancelled) {
          setError("No se pudieron cargar noticias.");
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNews();
    return () => { cancelled = true; };
  }, [NEWSAPI_KEY]);

  return (
    <section className="football-news">
      <h3>Latest soccer news</h3>

      {loading && <p>Loading news...</p>}
      {error && <p className="news-error">{error}</p>}
      {!loading && !error && articles.length === 0 && (
        <p>No se han encontrado noticias recientes.</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="news-scroll" role="region" aria-label="Carrusel de noticias">
          {articles.map((a) => (
            <article key={a.url ?? `${a.title}-${a.publishedAt}`} className="news-card">
              {a.urlToImage && (
                <img src={a.urlToImage ?? ""} alt={a.title ?? ""} className="news-thumb" />
              )}
              <div className="news-body">
                <a
                  href={a.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-title"
                >
                  {a.title}
                </a>
                <p className="news-source">
                  {a.source?.name ?? "Fuente"} ·{" "}
                  {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}
                </p>
                <p className="news-desc">{a.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Controles de scroll accesibles (opcionales) */}
      {!loading && !error && articles.length > 0 && (
        <div className="news-controls">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const el = document.querySelector(".news-scroll");
              if (el) el.scrollBy({ left: -320, behavior: "smooth" });
            }}
          >
            ◀︎
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const el = document.querySelector(".news-scroll");
              if (el) el.scrollBy({ left: 320, behavior: "smooth" });
            }}
          >
            ▶︎
          </button>
        </div>
      )}
    </section>
  );
}
