import { Link } from 'react-router-dom';
import { Truck, Shield, MapPin, Clock, DollarSign, BarChart3, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 lg:pt-32 lg:pb-40">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                Move freight
                <span className="text-primary-500"> smarter</span>,
                not harder
              </h1>
              <p className="mt-6 text-xl text-gray-400 max-w-xl leading-relaxed">
                Connect with thousands of verified carriers and shippers. 
                Real-time tracking, instant quotes, and seamless payments—all in one platform.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link to="/register?type=shipper" className="btn-primary text-center text-base py-3.5 px-7 text-base font-semibold">
                  Ship Freight
                </Link>
                <Link to="/register?type=driver" className="btn-secondary text-center text-base py-3.5 px-7 text-base font-semibold">
                  Become a Carrier
                </Link>
              </div>
              <div className="mt-16 grid grid-cols-3 gap-8 sm:gap-12">
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1.5">50K+</div>
                  <div className="text-sm text-gray-400">Active Carriers</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1.5">1M+</div>
                  <div className="text-sm text-gray-400">Loads Delivered</div>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1.5">99.5%</div>
                  <div className="text-sm text-gray-400">On-time Rate</div>
                </div>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <div className="bg-dark-800 rounded-2xl p-8 border border-dark-700/50 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-gray-400 text-sm font-medium">Live Shipment</span>
                  <span className="bg-primary-500/15 text-primary-400 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-primary-500/30">
                    In Transit
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 bg-primary-500 rounded-full mt-2 shrink-0 shadow-lg shadow-primary-500/50" />
                    <div>
                      <div className="font-semibold text-base">Sydney, NSW</div>
                      <div className="text-sm text-gray-400 mt-1">Picked up 2h ago</div>
                    </div>
                  </div>
                  <div className="ml-1.5 w-0.5 h-8 bg-gradient-to-b from-primary-500/50 to-dark-600" />
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 border-2 border-gray-400 rounded-full mt-2 shrink-0" />
                    <div>
                      <div className="font-semibold text-base">Melbourne, VIC</div>
                      <div className="text-sm text-gray-400 mt-1">ETA: 6h 30m</div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-dark-700/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Driver</span>
                    <span className="font-medium text-sm">John D. • 4.9 ★</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Vehicle</span>
                    <span className="font-medium text-sm">Semi-Trailer • 22T</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-dark-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Everything you need to move freight</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful tools for shippers, carriers, and fleet operators
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Real-time Tracking', desc: 'GPS tracking with live ETAs and geofencing alerts' },
              { icon: Shield, title: 'Verified Carriers', desc: 'All carriers are vetted with insurance and compliance checks' },
              { icon: Clock, title: 'Instant Matching', desc: 'AI-powered matching finds the best carrier in seconds' },
              { icon: DollarSign, title: 'Transparent Pricing', desc: 'Upfront quotes with no hidden fees' },
              { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track performance, costs, and optimize routes' },
              { icon: Truck, title: 'Backhaul Optimization', desc: 'Reduce empty miles and maximize earnings' },
            ].map((feature, i) => (
              <div key={i} className="card hover:border-primary-500/50 transition-all hover:-translate-y-1 cursor-default">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center mb-5">
                  <feature.icon className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">Ready to transform your logistics?</h2>
          <p className="text-xl text-gray-400 mb-10">
            Join thousands of businesses already using Truckify
          </p>
          <Link to="/register" className="btn-primary inline-flex items-center text-base py-3.5 px-8 text-base font-semibold">
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-800/50 border-t border-dark-700/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2.5">
              <Truck className="h-6 w-6 text-primary-500" />
              <span className="font-bold text-lg text-white">Truckify</span>
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
