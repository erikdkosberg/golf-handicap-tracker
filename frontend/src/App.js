import React, { useEffect, useState } from "react";
import axios from "axios";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import API_URL from "./api";
import "./index.css";

function App() {
  const [token, setToken] = useState("");
  const [view, setView] = useState("login");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (!stored) {
      setAuthChecked(true);
      return;
    }

    axios
      .get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      })
      .then(() => {
        setToken(stored);
        setView("dashboard");
      })
      .catch(() => {
        localStorage.removeItem("token");
        setToken("");
        setView("login");
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  const handleLogin = (tkn) => {
    setToken(tkn);
    localStorage.setItem("token", tkn);
    setView("dashboard");
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("token");
    setView("login");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-white to-sky-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-indigo-700">
          <svg
            className="animate-spin h-8 w-8"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-white to-sky-100 flex flex-col items-center">
      <header className="w-full flex flex-col items-center py-8 mb-4">
        <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
          Golf Handicap Tracker
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Track your golf handicap and see how your next round can change it.
        </p>
      </header>
      <main className="w-full flex-1 flex items-center justify-center">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-6xl">
          {view === "login" && (
            <Login
              onLogin={handleLogin}
              switchToRegister={() => setView("register")}
            />
          )}
          {view === "register" && (
            <Register switchToLogin={() => setView("login")} />
          )}
          {view === "dashboard" && token && (
            <Dashboard token={token} onLogout={handleLogout} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
