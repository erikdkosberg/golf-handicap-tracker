import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import "./index.css"; // Tailwind import

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [view, setView] = useState(token ? "dashboard" : "login");

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

  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-50 via-white to-sky-100 flex flex-col items-center">
      <header className="w-full flex flex-col items-center py-8 mb-4">
        <h1 className="text-4xl font-extrabold text-indigo-700 tracking-tight">
          Golf Handicap Calculator
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
          {view === "dashboard" && (
            <Dashboard token={token} onLogout={handleLogout} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
