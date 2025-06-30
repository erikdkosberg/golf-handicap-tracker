import React, { useState } from "react";
import axios from "axios";
import API_URL from "../api";

export default function Login({ onLogin, switchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      onLogin(res.data.token);
    } catch (err) {
      setMsg(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-indigo-700 mb-1">Login</h2>
      <input
        className="border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-indigo-400"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        className="border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-indigo-400"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white rounded-lg py-2 font-semibold hover:bg-indigo-700 transition"
      >
        Login
      </button>
      <button
        type="button"
        className="text-indigo-500 underline text-sm"
        onClick={switchToRegister}
      >
        Register new account
      </button>
      {msg && <div className="text-rose-600">{msg}</div>}
    </form>
  );
}
