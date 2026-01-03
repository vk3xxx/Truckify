import { Link } from 'react-router-dom';
import { Truck, Shield, MapPin, Clock, DollarSign, BarChart3, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Move freight
                <span className="text-primary-500"> smarter</span>,
                not harder
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-lg">
                Connect with thousands of verified carriers and shippers. 
                Real-time tracking, instant quotes, and seamless payments.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link to="/register?type=shipper" className="btn-primary text-center text-lg py-4 px-8">
                  Ship Freight
                </Link>
                <Link to="/register?type=driver" className="btn-secondary text-center text-lg py-4 px-8">
                  Become a Carrier
                </Link>
              </div>
              <div className="mt-14 grid grid-cols-3 gap-6 sm:gap-10">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">50K+</div>
                  <div className="text-sm sm:text-base text-gray-400 mt-1">Active Carriers</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">1M+</div>
                  <div className="text-sm sm:text-base text-gray-400 mt-1">Loads Delivered</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">99.5%</div>
                  <div className="text-sm sm:text-base text-gray-400 mt-1">On-time Rate</div>
                </div>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <div className="bg-dark-800 rounded-2xl p-6 sm:p-8 border border-dark-700 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-gray-400 font-medium">Live Shipment</span>
                  <span className="bg-primary-500/20 text-primary-500 px-3 py-1 rounded-full text-sm font-medium">
                    In Transit
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-primary-500 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <div className="font-medium">Sydney, NSW</div>
                      <div className="text-sm text-gray-400 mt-0.5">Picked up 2h ago</div>
                    </div>
                  </div>
                  <div className="ml-1.5 w-0.5 h-6 bg-dark-600" />
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 border-2 border-gray-500 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <div className="font-medium">Melbourne, VIC</div>
                      <div className="text-sm text-gray-400 mt-0.5">ETA: 6h 30m</div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-dark-700 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Driver</span>
                    <span className="font-medium">John D. • 4.9 ★</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Vehicle</span>
                    <span className="font-medium">Semi-Trailer • 22T</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-dark-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to move freight</h2>
            <p className="mt-4 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful tools for shippers, carriers, and fleet operators
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: MapPin, title: 'Real-time Tracking', desc: 'GPS tracking with live ETAs and geofencing alerts' },
              { icon: Shield, title: 'Verified Carriers', desc: 'All carriers are vetted with insurance and compliance checks' },
              { icon: Clock, title: 'Instant Matching', desc: 'AI-powered matching finds the best carrier in seconds' },
              { icon: DollarSign, title: 'Transparent Pricing', desc: 'Upfront quotes with no hidden fees' },
              { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track performance, costs, and optimize routes' },
              { icon: Truck, title: 'Backhaul Optimization', desc: 'Reduce empty miles and maximize earnings' },
            ].map((feature, i) => (
              <div key={i} className="card hover:border-primary-500/50 transition-all hover:-translate-y-1">
                <feature.icon className="h-10 w-10 text-primary-500 mb-5" />
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to transform your logistics?</h2>
          <p className="mt-4 text-lg sm:text-xl text-gray-400">
            Join thousands of businesses already using Truckify
          </p>
          <Link to="/register" className="btn-primary inline-flex items-center mt-10 text-lg py-4 px-8">
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-800 border-t border-dark-700 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-6 w-6 text-primary-500" />
              <span className="font-bold text-lg">Truckify</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2026 Truckify. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
