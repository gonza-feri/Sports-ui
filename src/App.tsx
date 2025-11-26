import { Routes, Route } from "react-router-dom";
import TeamsPage  from "./pages/TeamsPage";
import TeamDetailPage from "./pages/TeamDetailPage";
import AddTeamPage from "./pages/AddTeamPage";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import "./App.css";
import "./index.css";

function App() {
  return (
    <div className="app">
      <main className="content">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/teams" element={<TeamsPage  />} />
        <Route path="/teams/add" element={<AddTeamPage />} />
        <Route path="/teams/:id" element={<TeamDetailPage />} />
        <Route path="/teams/add/:id" element={<AddTeamPage />} />
      </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
