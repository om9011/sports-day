import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { teamsData } from "../teams"; // import your teams/groups mapping
import "./ScoreCard.css";

export default function ScoreCard() {
  const [activeTab, setActiveTab] = useState("ongoing");
  const [sportFilter, setSportFilter] = useState("all");

  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [enteredPass, setEnteredPass] = useState("");

  const [newSport, setNewSport] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "admin123";

  const [matches, setMatches] = useState([]);

  // **Realtime fetch matches from Firestore**
  useEffect(() => {
    const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMatches(data);
    });
    return () => unsubscribe();
  }, []);

  // FILTERED MATCHES
  const filteredMatches = matches
    .filter(m => m.status === activeTab)
    .filter(m => sportFilter === "all" ? true : m.sport === sportFilter);

  // ADD UPCOMING MATCH
  const handleAddMatch = async () => {
    if (!newSport || !teamA || !teamB) {
      alert("Please fill all fields");
      return;
    }
    try {
      await addDoc(collection(db, "matches"), {
        sport: newSport,
        teamA,
        teamB,
        scoreA: null,
        scoreB: null,
        status: "upcoming",
        createdAt: new Date()
      });
      setNewSport("");
      setTeamA("");
      setTeamB("");
      alert("Match added!");
    } catch (err) {
      console.error("Error adding match:", err);
    }
  };

  // START UPCOMING MATCH
  const handleStartMatch = async (matchId) => {
    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, { status: "ongoing" });
      alert("Match started!");
    } catch (err) {
      console.error("Error starting match:", err);
    }
  };

  // UPDATE SCORE
  const handleUpdateScore = async (matchId, teamAName, teamBName) => {
    const scoreA = parseInt(prompt(`Score for ${teamAName}:`));
    const scoreB = parseInt(prompt(`Score for ${teamBName}:`));

    if (isNaN(scoreA) || isNaN(scoreB)) {
      alert("Invalid score");
      return;
    }

    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, { scoreA, scoreB, status: "completed" });
      alert("Match updated!");
    } catch (err) {
      console.error("Error updating score:", err);
    }
  };


  // OPEN PASSWORD POPUP WHEN ADMIN CLICK
  useEffect(() => {
    const handler = () => setShowPasswordPopup(true);
    window.addEventListener("open-admin", handler);
    return () => window.removeEventListener("open-admin", handler);
  }, []);

  // --- POINTS TABLE CALCULATION ---
  const calculatePointsTableByGroup = () => {
    const table = {};

    // Loop over sports
    for (let sportName in teamsData) {
      table[sportName] = {};

      // Loop over groups in this sport
      const groups = teamsData[sportName];
      for (let groupName in groups) {
        table[sportName][groupName] = {};

        groups[groupName].forEach(team => {
          table[sportName][groupName][team] = { won: 0, lost: 0, points: 0 };
        });
      }
    }

    // Loop over matches
    matches
      .filter(m => m.status === "completed")
      .forEach(m => {
        if (!table[m.sport]) return;

        // Find which group teamA and teamB belong to
        let groupA, groupB;
        for (let g in table[m.sport]) {
          if (table[m.sport][g][m.teamA] !== undefined) groupA = g;
          if (table[m.sport][g][m.teamB] !== undefined) groupB = g;
        }
        if (!groupA || !groupB) return;

        // Update points
        if (m.scoreA > m.scoreB) {
          table[m.sport][groupA][m.teamA].won += 1;
          table[m.sport][groupA][m.teamA].points += 2;
          table[m.sport][groupB][m.teamB].lost += 1;
        } else if (m.scoreB > m.scoreA) {
          table[m.sport][groupB][m.teamB].won += 1;
          table[m.sport][groupB][m.teamB].points += 2;
          table[m.sport][groupA][m.teamA].lost += 1;
        }
      });

    return table;
  };

  const pointsTable = calculatePointsTableByGroup();




  return (
    <div className="score-container">
      {/* PASSWORD POPUP */}
      {showPasswordPopup && (
        <div className="popup-overlay">
          <div className="password-box">
            <h3>Enter Admin Password</h3>
            <div className="inputs">
              <input
                type="password"
                placeholder="Enter password"
                value={enteredPass}
                onChange={(e) => setEnteredPass(e.target.value)}
              />
              <div className="password-btns">
                <button
                  className="admin-btn-save"
                  onClick={() => {
                    if (enteredPass === ADMIN_PASSWORD) {
                      setShowPasswordPopup(false);
                      setShowAdminPopup(true);
                      setEnteredPass("");
                    } else alert("Wrong password!");
                  }}
                >Login</button>
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowPasswordPopup(false);
                    setEnteredPass("");
                  }}
                >Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {showAdminPopup && (
        <div className="popup-overlay">
          <div className="admin-panel">
            <div className="admin-header">
              <h2>Admin Panel</h2>
              <button className="admin-close" onClick={() => setShowAdminPopup(false)}>✖</button>
            </div>

            {/* ADD MATCH */}
            <div className="admin-section">
              <h3>Add Upcoming Match</h3>
              <select value={newSport} onChange={(e) => setNewSport(e.target.value)} className="admin-input">
                <option value="">Select Sport</option>
                <option value="Langadi">Langadi</option>
                <option value="Kabaddi">Kabaddi</option>
                <option value="Senior Kabaddi">Senior Kabaddi</option>
              </select>

              {/* Team A Dropdown */}
              <select value={teamA} onChange={(e) => setTeamA(e.target.value)} className="admin-input">
                <option value="">Select Team A</option>
                {newSport && Object.values(teamsData[newSport]).flat().map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>

              {/* Team B Dropdown */}
              <select value={teamB} onChange={(e) => setTeamB(e.target.value)} className="admin-input">
                <option value="">Select Team B</option>
                {newSport && Object.values(teamsData[newSport]).flat().map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>

              <button className="admin-btn-save" onClick={handleAddMatch}>➕ Add Match</button>
            </div>


            {/* START UPCOMING MATCH */}
            <div className="admin-section">
              <h3>Start Upcoming Match</h3>
              {matches.filter(m => m.status === "upcoming").length === 0 && <p className="empty-msg">No upcoming matches</p>}
              {matches.filter(m => m.status === "upcoming").map(m => (
                <button key={m.id} className="admin-btn-save" onClick={() => handleStartMatch(m.id)}>
                  Start {m.teamA} vs {m.teamB}
                </button>
              ))}
            </div>

            {/* UPDATE SCORE */}
            <div className="admin-section">
              <h3>Update Ongoing Match</h3>
              {matches.filter(m => m.status === "ongoing").length === 0 && <p className="empty-msg">No ongoing matches</p>}
              {matches.filter(m => m.status === "ongoing").map(m => (
                <button
                  key={m.id}
                  className="admin-btn-save"
                  onClick={() => handleUpdateScore(m.id, m.teamA, m.teamB)}
                >
                  Update {m.teamA} vs {m.teamB}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="tabs">
        <button className={activeTab === "ongoing" ? "tab active" : "tab"} onClick={() => setActiveTab("ongoing")}>Ongoing</button>
        <button className={activeTab === "completed" ? "tab active" : "tab"} onClick={() => setActiveTab("completed")}>Completed</button>
        <button className={activeTab === "upcoming" ? "tab active" : "tab"} onClick={() => setActiveTab("upcoming")}>Upcoming</button>
        <button className={activeTab === "points" ? "tab active" : "tab"} onClick={() => setActiveTab("points")}>Points Table</button>
      </div>

      {/* SPORT FILTER */}
      <div className="filter-box">
        <label>Sport</label>
        <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="Langadi">Langadi</option>
          <option value="Kabaddi">Kabaddi</option>
          <option value="Senior Kabaddi">Senior Kabaddi</option>
        </select>
      </div>

      {/* MATCH CARDS */}
      {activeTab !== "points" && (
        <div className="cards-box">
          {filteredMatches.length === 0 && <p className="empty-msg">No matches found</p>}
          {filteredMatches.map(m => (
            <div className="match-card" key={m.id}>
              <span className="sport-tag">{m.sport}</span>
              <div className="teams">
                <div className="team">
                  <div className="team-name-box">{m.teamA}</div>
                  <div className="team-score-box" style={{
                    background: m.scoreA !== null && m.scoreB !== null
                      ? m.scoreA > m.scoreB ? "green" : m.scoreA < m.scoreB ? "red" : "#000"
                      : "#000",
                    border: m.scoreA !== null && m.scoreB !== null
                      ? m.scoreA > m.scoreB ? "2px solid green" : m.scoreA < m.scoreB ? "2px solid red" : "2px solid #000"
                      : "2px solid #000"
                  }}>
                    {m.scoreA !== null ? m.scoreA : "-"}
                  </div>
                </div>
                <div className="vs-circle">VS</div>
                <div className="team">
                  <div className="team-name-box">{m.teamB}</div>
                  <div className="team-score-box" style={{
                    background: m.scoreA !== null && m.scoreB !== null
                      ? m.scoreB > m.scoreA ? "green" : m.scoreB < m.scoreA ? "red" : "#000"
                      : "#000",
                    border: m.scoreA !== null && m.scoreB !== null
                      ? m.scoreB > m.scoreA ? "2px solid green" : m.scoreB < m.scoreA ? "2px solid red" : "2px solid #000"
                      : "2px solid #000"
                  }}>
                    {m.scoreB !== null ? m.scoreB : "-"}
                  </div>
                </div>
              </div>
              <div className="time">{m.status === "upcoming" ? "Match not started" : m.status}</div>
            </div>
          ))}
        </div>
      )}

      {/* POINTS TABLE */}
      {activeTab === "points" && (
  <div className="cards-box">
    {(sportFilter === "all" ? Object.keys(pointsTable) : [sportFilter]).map(sport => (
      <div key={sport} className="match-card">
        <span className="sport-tag">{sport}</span>

        {Object.keys(pointsTable[sport]).map(groupName => (
          <div key={groupName} className="points-table">
            <h4 className="points-group-title">{groupName}</h4>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pointsTable[sport][groupName])
                  .sort((a, b) => b[1].points - a[1].points)
                  .map(([team, data], idx, arr) => (
                    <tr key={team} className={idx === 0 ? "top-team" : idx === arr.length - 1 ? "low-team" : ""}>
                      <td>{team}</td>
                      <td>{data.won}</td>
                      <td>{data.lost}</td>
                      <td>{data.points}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    ))}
  </div>
)}


    </div>
  );
}
