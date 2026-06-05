import React, { useState } from "react";
import axios from "axios";
import API_URL from "../api";

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
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
  );
}

export default function Login({ onLogin, switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      onLogin(res.data.token);
    } catch (err) {
      setMsg(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-indigo-700 mb-1">Login</h2>
      <input
        className="border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-indigo-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        required
      />
      <input
        type="password"
        className="border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-indigo-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white rounded-lg py-2 font-semibold hover:bg-indigo-700 transition disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Spinner />
            Logging in...
          </>
        ) : (
          "Login"
        )}
      </button>
      <button
        type="button"
        className="text-indigo-500 underline text-sm disabled:text-indigo-300"
        onClick={switchToRegister}
        disabled={loading}
      >
        Register new account
      </button>
      {msg && <div className="text-rose-600">{msg}</div>}
    </form>
  );
}
