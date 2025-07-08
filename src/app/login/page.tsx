import React from "react";
import { FaGoogle, FaMicrosoft, FaGithub, FaApple, FaKey } from "react-icons/fa";
import { useState } from "react";
import dynamic from "next/dynamic";

// Hanko web component loader (client-side only)
const HankoAuth = dynamic(
  async () => {
    const { Hanko } = await import("@teamhanko/hanko-elements");
    return (props: any) => <hanko-auth {...props} />;
  },
  { ssr: false }
);

const hankoApi = "https://passkeys.hanko.io/18259e54-a8e4-4682-85c5-9843f66d1fa0"; // TODO: Replace with your Hanko project URL

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded shadow flex flex-col gap-6">
        <div className="flex flex-col items-center mb-2">
          <span className="font-bold text-2xl mb-2 tracking-tight">Truckify</span>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input type="email" placeholder="Enter your email..." value={email} onChange={e => setEmail(e.target.value)} className="px-4 py-2 border rounded" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="px-4 py-2 border rounded" required />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button type="submit" className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 transition">Sign in</button>
        </form>
        <div className="flex items-center my-2">
          <div className="flex-grow h-px bg-gray-200" />
          <span className="mx-2 text-gray-400 text-sm">OR</span>
          <div className="flex-grow h-px bg-gray-200" />
        </div>
        <div className="flex flex-col gap-2">
          <button className="flex items-center justify-center gap-2 border rounded px-4 py-2 hover:bg-gray-50 transition"><FaGoogle className="text-lg" /> Sign in with Google</button>
          <button className="flex items-center justify-center gap-2 border rounded px-4 py-2 hover:bg-gray-50 transition"><FaMicrosoft className="text-lg" /> Sign in with Microsoft</button>
          <button className="flex items-center justify-center gap-2 border rounded px-4 py-2 hover:bg-gray-50 transition"><FaGithub className="text-lg" /> Sign in with GitHub</button>
          <button className="flex items-center justify-center gap-2 border rounded px-4 py-2 hover:bg-gray-50 transition"><FaApple className="text-lg" /> Sign in with Apple</button>
          {/* Hanko Passkey Auth */}
          <div className="flex items-center justify-center mt-2">
            <HankoAuth api={hankoApi} />
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 mt-4">
          <span className="font-semibold">First time?</span> Learn more at <a href="https://tailscale.com" className="underline">tailscale.com</a>.
        </div>
      </div>
      <div className="text-xs text-gray-400 text-center mt-6 max-w-md">
        By clicking the buttons above, you acknowledge that you have read, understood, and agree to Truckify's <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
      </div>
    </div>
  );
} 