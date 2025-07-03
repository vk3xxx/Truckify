"use client";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Navigation Bar */}
      <nav className="w-full bg-black text-white flex items-center justify-between px-8 py-4">
        <div className="text-2xl font-bold tracking-tight">Truckify</div>
        <div className="flex items-center gap-8">
          <a href="#" className="hover:underline">Ride</a>
          <a href="#" className="hover:underline">Drive</a>
          <a href="#" className="hover:underline">Business</a>
          <a href="#" className="hover:underline">About</a>
          <a href="#" className="hover:underline">Help</a>
          <a href="/login" className="ml-4 bg-white text-black font-semibold px-5 py-2 rounded-full border border-black hover:bg-gray-100 transition">Login</a>
          <a href="/signup" className="ml-2 bg-black text-white font-semibold px-5 py-2 rounded-full border border-black hover:bg-gray-900 transition">Sign up</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-8 py-16 max-w-7xl mx-auto w-full">
        <div className="flex-1 max-w-xl">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">Go anywhere with <span className="text-black">Truckify</span></h1>
          <div className="bg-gray-100 rounded-xl p-6 mb-6 shadow flex flex-col gap-4">
            <input type="text" placeholder="Pickup location" className="px-4 py-3 rounded bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black" />
            <input type="text" placeholder="Dropoff location" className="px-4 py-3 rounded bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black" />
            <div className="flex gap-2 mt-2">
              <button className="bg-black text-white px-6 py-2 rounded-full font-semibold hover:bg-gray-900 transition">See prices</button>
              <button className="bg-gray-200 text-black px-6 py-2 rounded-full font-semibold hover:bg-gray-300 transition">Log in to see your recent activity</button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex justify-center md:justify-end mt-10 md:mt-0">
          <Image
            src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80"
            alt="Modern truck illustration"
            width={400}
            height={300}
            className="rounded-2xl shadow-lg border border-gray-200 bg-gray-100"
            priority
          />
        </div>
      </section>

      {/* Suggestions Section */}
      <section className="max-w-7xl mx-auto w-full px-8 pb-16">
        <h2 className="text-3xl font-bold mb-8">Suggestions</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-100 rounded-xl p-6 shadow flex flex-col items-start">
            <h3 className="text-xl font-semibold mb-2">Move</h3>
            <p className="text-gray-700 mb-4">Go anywhere with Truckify. Request a truck, load up, and go.</p>
            <button className="bg-black text-white px-5 py-2 rounded-full font-semibold hover:bg-gray-900 transition">Details</button>
          </div>
          <div className="bg-gray-100 rounded-xl p-6 shadow flex flex-col items-start">
            <h3 className="text-xl font-semibold mb-2">Reserve</h3>
            <p className="text-gray-700 mb-4">Reserve your truck in advance so you can relax on the day of your move.</p>
            <button className="bg-black text-white px-5 py-2 rounded-full font-semibold hover:bg-gray-900 transition">Details</button>
          </div>
          <div className="bg-gray-100 rounded-xl p-6 shadow flex flex-col items-start">
            <h3 className="text-xl font-semibold mb-2">Business</h3>
            <p className="text-gray-700 mb-4">Move goods for your business with ease and reliability using Truckify.</p>
            <button className="bg-black text-white px-5 py-2 rounded-full font-semibold hover:bg-gray-900 transition">Details</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 bg-gray-100 border-t border-gray-200 text-center text-gray-600 text-sm mt-auto">
        &copy; {new Date().getFullYear()} Truckify. Inspired by Uber. All rights reserved.
      </footer>
    </div>
  );
}
