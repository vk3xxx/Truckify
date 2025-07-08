"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", email);
    params.append("password", password);
    params.append("client_id", "truckify-client");
    params.append("client_secret", "truckify-secret");
    const res = await fetch("http://10.0.1.5:4000/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (res.ok) {
      const data = await res.json();
      // Store token in localStorage or cookie
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/";
    } else {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow max-w-md w-full flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-4">Log in to Truckify</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="px-4 py-2 border rounded" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="px-4 py-2 border rounded" required />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 transition">Log in</button>
      </form>
    </div>
  );
} 