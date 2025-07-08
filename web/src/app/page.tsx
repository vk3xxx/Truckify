"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Truckify!</h1>
        <p className="mb-4">Please <a href="/login" className="underline">log in</a> or <a href="/signup" className="underline">sign up</a> to continue.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Welcome, {profile.name || profile.email}!</h1>
      <div className="bg-white rounded shadow p-4 mb-4">
        <div><b>Email:</b> {profile.email}</div>
        <div><b>Name:</b> {profile.name}</div>
        <div><b>Joined:</b> {profile.created_at}</div>
      </div>
      <a href="/profile" className="inline-block bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 transition">Edit Profile &amp; 2FA</a>
    </div>
  );
}
