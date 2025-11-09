import { useEffect, useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

type Article = {
  title: string;
  url: string;
  urlToImage?: string | null;
  source: { name: string };
};

const placeholderImg =
  "https://images.unsplash.com/photo-1521417532886-55d2f88f0a52?q=80&w=1200&auto=format&fit=crop"; // placeholder neutro

function NewsSkeleton() {
  return (
    <section className="news-carousel">
      <h2>International Football News</h2>
      <div className="news-card skeleton">
        <div className="img-skeleton" />
        <div className="text-skeleton" />
        <div className="text-skeleton short" />
      </div>
    </section>
  );
}

export default function FootballNews() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      `https://newsapi.org/v2/everything?q=soccer&language=en&apiKey=6866d2f9cd2b482da43ecda2e5fdf898`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data?.articles) {
          setError("No news available");
          return;
        }
        const cleaned = (data.articles as Article[])
          .filter((a) => a?.title && a?.url) // asegurar datos básicos
          .slice(0, 8); // máximo 8
        setArticles(cleaned);
      })
      .catch(() => setError("Error fetching news"));
  }, []);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4500,
    adaptiveHeight: true,
    arrows: true,
  } as const;

  if (error && articles.length === 0) {
    return (
      <section className="news-carousel">
        <h2>International Football News</h2>
        <p className="news-error">Unable to load news right now.</p>
      </section>
    );
  }

  return articles.length > 0 ? (
    <section className="news-carousel">
      <h2>International Football News</h2>
      <Slider {...settings}>
        {articles.map((a, i) => (
          <div key={`${a.url}-${i}`} className="news-card">
            <img
              src={a.urlToImage || placeholderImg}
              alt={a.title}
              className="news-img"
            />
            <div className="news-content">
              <h3 className="news-title">{a.title}</h3>
              <p className="news-source">{a.source?.name || "Unknown source"}</p>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link"
              >
                Read more
              </a>
            </div>
          </div>
        ))}
      </Slider>
    </section>
  ) : (
    <NewsSkeleton />
  );
}