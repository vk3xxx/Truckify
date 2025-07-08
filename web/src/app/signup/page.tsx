"use client";
import { useState } from "react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    const res = await fetch("http://10.0.1.5:4000/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => { window.location.href = "/login"; }, 1000);
    } else {
      setError("Signup failed. Email may already be registered.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSignup} className="bg-white p-8 rounded shadow max-w-md w-full flex flex-col gap-4">
        <h2 className="text-2xl font-bold mb-4">Sign up for Truckify</h2>
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="px-4 py-2 border rounded" required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="px-4 py-2 border rounded" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="px-4 py-2 border rounded" required />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {success && <div className="text-green-600 text-sm">Signup successful! Redirecting to login...</div>}
        <button type="submit" className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 transition">Sign up</button>
      </form>
    </div>
  );
} 