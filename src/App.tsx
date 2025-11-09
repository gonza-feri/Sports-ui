import { Routes, Route } from "react-router-dom";
import TeamList from "./pages/TeamList";
import TeamDetail from "./pages/TeamDetail";
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
        <Route path="/teams" element={<TeamList />} />
        <Route path="/teams/add" element={<AddTeamPage />} />
        <Route path="/teams/:id" element={<TeamDetail />} />
      </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
