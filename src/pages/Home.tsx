export default function Home() {
  return (
    <section className="home">
      <h2>Bienvenido a Dream League</h2>
      <p>
        Esta es la página de inicio. Aquí puedes encontrar información general,
        términos legales y enlaces para navegar a las secciones de equipos y jugadores.
      </p>
      <div className="home-links">
        <a href="/teams" className="nav-btn">Ver equipos</a>
      </div>
    </section>
  );
}
