import Menu from "../components/Menu";
import FootballNews from "../components/FootballNews";

export default function Home() {
  return (
    <>
      <Menu />
      <section className="home">
        <FootballNews />
      </section>
    </>
  );
}
