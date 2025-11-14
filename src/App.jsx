import ScoreCard from "./pages/ScoreCard";
import logo from "./assets/logo.png";
import "./App.css";

export default function App() {
  return (
    <div className="app-container">
      
      {/* IMPRESSIVE NAVBAR */}
      <header className="navbar">
        <div className="nav-left">
          {/* Optional Logo */}
          <img src={logo} alt="logo" className="logo" />
        </div>

        <h1 className="app-title">🏆Sports Scoreboard🏆</h1>

        <button
          className="admin-icon"
          onClick={() => {
            const evt = new CustomEvent("open-admin");
            window.dispatchEvent(evt);
          }}
          title="Admin Panel"
        >
          ⚙️
        </button>
      </header>

      <ScoreCard />
    </div>
  );
}
