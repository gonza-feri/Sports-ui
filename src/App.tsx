import { Routes, Route } from "react-router-dom";
import TeamList from "./pages/TeamList";
import TeamDetail from "./pages/TeamDetail";
import Menu from "./components/Menu";
import Footer from "./components/Footer";
import "./App.css";
import "./index.css";

function App() {
  return (
    <div className="app">
      <Menu />
      <main className="content">
        <Routes>
          <Route path="/" element={<TeamList />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
