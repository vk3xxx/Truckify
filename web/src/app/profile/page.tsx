"use client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("http://10.0.1.5:4000/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setProfile(data);
        setName(data?.name || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;
    const res = await fetch("http://10.0.1.5:4000/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setMessage("Profile updated!");
    } else {
      setMessage("Failed to update profile.");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!profile) return <div className="p-8 text-center">Please log in to view your profile.</div>;

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <form onSubmit={handleUpdate} className="bg-white rounded shadow p-4 mb-4 flex flex-col gap-4">
        <div>
          <label className="block font-semibold mb-1">Email</label>
          <input type="text" value={profile.email} disabled className="px-4 py-2 border rounded w-full bg-gray-100" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="px-4 py-2 border rounded w-full" />
        </div>
        <button type="submit" className="bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 transition">Update Profile</button>
        {message && <div className="text-center text-sm text-green-600">{message}</div>}
      </form>
      <div className="bg-white rounded shadow p-4 mt-6">
        <h2 className="text-lg font-bold mb-2">Two-Factor Authentication (2FA)</h2>
        <p className="mb-2">Add extra security to your account by enabling passkey (WebAuthn) authentication.</p>
        {/* Hanko or SimpleWebAuthn component can be placed here */}
        <div className="mt-2">
          <span className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded">Passkey (WebAuthn) integration coming soon</span>
        </div>
      </div>
    </div>
  );
} 