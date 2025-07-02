"use client";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight">Truckify</span>
        </div>
        <nav className="flex gap-8 text-lg">
          <a href="#features" className="hover:text-yellow-400 transition">Features</a>
          <a href="#about" className="hover:text-yellow-400 transition">About</a>
          <a href="#contact" className="hover:text-yellow-400 transition">Contact</a>
        </nav>
        <button className="bg-yellow-400 text-black px-6 py-2 rounded-full font-semibold hover:bg-yellow-300 transition">Get Started</button>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-8 py-20 bg-black">
        <div className="max-w-xl">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Move Anything, <span className="text-yellow-400">Anywhere</span>.<br />
            <span className="text-gray-300 font-light">The Uber for Trucks.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Truckify connects you with reliable, on-demand truck transport for goods of any size. Fast, safe, and easy—just like hailing a ride.
          </p>
          <button className="bg-yellow-400 text-black px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-300 transition">Book a Truck</button>
        </div>
        <div className="mt-12 md:mt-0 md:ml-16 flex-shrink-0">
          <Image
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
            alt="Modern truck on the road"
            width={500}
            height={350}
            className="rounded-2xl shadow-lg border-4 border-yellow-400"
            priority
          />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-900 py-20 px-8">
        <h2 className="text-4xl font-bold text-center mb-12 text-yellow-400">Why Truckify?</h2>
        <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
          <div className="bg-black rounded-xl p-8 border border-gray-800 flex flex-col items-center">
            <Image src="/file.svg" alt="Fast" width={64} height={64} className="mb-4" />
            <h3 className="text-2xl font-semibold mb-2">On-Demand</h3>
            <p className="text-gray-300 text-center">Book a truck instantly, anytime you need to move goods—no waiting, no hassle.</p>
          </div>
          <div className="bg-black rounded-xl p-8 border border-gray-800 flex flex-col items-center">
            <Image src="/globe.svg" alt="Global" width={64} height={64} className="mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Nationwide</h3>
            <p className="text-gray-300 text-center">Our network covers cities and regions across the country. Move anything, anywhere.</p>
          </div>
          <div className="bg-black rounded-xl p-8 border border-gray-800 flex flex-col items-center">
            <Image src="/window.svg" alt="Easy" width={64} height={64} className="mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Effortless</h3>
            <p className="text-gray-300 text-center">Simple booking, real-time tracking, and transparent pricing—all in one app.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-yellow-400 mb-6">About Truckify</h2>
          <p className="text-xl text-gray-300 mb-8">
            Inspired by Uber's seamless ride-hailing experience, Truckify brings the same convenience to logistics. Whether you're a business or an individual, our platform makes moving goods as easy as booking a ride.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-gray-900 py-20 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-yellow-400 mb-6">Contact Us</h2>
          <p className="text-gray-300 mb-8">Have questions or want to partner with us? Reach out and our team will get back to you soon.</p>
          <a href="mailto:info@truckify.com" className="inline-block bg-yellow-400 text-black px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-300 transition">Email Us</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-8 bg-black border-t border-gray-800 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Truckify. Inspired by Uber. All rights reserved.
      </footer>
    </main>
  );
}
