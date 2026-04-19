import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  Target, 
  Cpu, 
  TrendingUp, 
  Clock,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const LandingPage = () => {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-100 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute bottom-0 left-[-5%] w-[400px] h-[400px] bg-accent-100 rounded-full blur-[100px] opacity-30"></div>
        </div>

        <div className="container mx-auto text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-50 text-primary-600 text-sm font-bold border border-primary-100 mb-8">
              <Zap className="w-4 h-4 mr-2 fill-primary-600" />
              Revolutionizing Vendor Matching
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
              Adaptive Resource <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-700">Relevance Engine</span>
            </h1>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              Match urgent resource requests with the most relevant vendors in real-time. 
              Powered by an intelligent ranking system that learns from every interaction.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Button size="lg" className="w-full sm:w-auto text-lg px-10" onClick={() => window.location.href='/register'}>
                Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-lg px-10">
                Book a Demo
              </Button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-20 relative p-4 bg-white/50 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] shadow-premium max-w-4xl mx-auto"
          >
             <div className="aspect-[16/9] bg-slate-100 rounded-[2rem] overflow-hidden">
                <div className="p-8 h-full flex flex-col">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="grid grid-cols-12 gap-6 flex-grow">
                    <div className="col-span-3 space-y-4">
                      <div className="h-4 bg-white rounded-lg w-full"></div>
                      <div className="h-4 bg-white rounded-lg w-3/4"></div>
                      <div className="h-4 bg-white rounded-lg w-full"></div>
                    </div>
                    <div className="col-span-9 bg-white rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between mb-8">
                        <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                        <div className="h-8 w-24 bg-primary-100 rounded-lg"></div>
                      </div>
                      <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl"></div>
                            <div className="flex-grow space-y-2">
                              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                              <div className="h-2 bg-slate-50 rounded w-1/3"></div>
                            </div>
                            <div className="h-8 w-16 bg-slate-50 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-display font-bold text-slate-900 mb-4">Powerful Features for Modern Enterprise</h2>
            <p className="text-lg text-slate-500">Everything you need to manage resources at scale.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Smart Matching', desc: 'AI-driven ranking based on proximity, stock levels, and historical performance.', icon: Target },
              { title: 'Real-time Analytics', desc: 'Track request fulfillment rates and vendor response times instantly.', icon: TrendingUp },
              { title: 'Secure & Reliable', desc: 'Enterprise-grade security and 99.9% uptime for critical resource allocation.', icon: Shield },
              { title: 'Predictive Insights', desc: 'Anticipate resource shortages before they happen with our adaptive engine.', icon: Cpu },
              { title: 'Lightning Fast', desc: 'Milliseconds count in emergencies. Our engine is optimized for high-speed matching.', icon: Clock },
              { title: 'Seamless Integration', desc: 'Connect with existing ERP and inventory systems via our robust API.', icon: Zap },
            ].map((f, i) => (
              <Card key={i} className="p-8 hover:-translate-y-2 transition-transform cursor-pointer group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-display font-bold text-slate-900 mb-8 leading-tight">Fast Decision Making with Intelligent Ranking</h2>
              <div className="space-y-8">
                {[
                  { title: 'Create a Request', desc: 'Simply input the resource needed, quantity, and urgency.' },
                  { title: 'Engine Analyzes Vendors', desc: 'AVRE scans hundreds of vendors based on availability and proximity.' },
                  { title: 'Get Ranked Matches', desc: 'Receive a prioritized list with a detailed "Why this match" explanation.' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold flex-shrink-0 mt-1">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h4>
                      <p className="text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-12" size="lg" onClick={() => window.location.href='/register'}>Explore Platform</Button>
            </div>
            <div className="md:w-1/2 relative">
               <div className="bg-primary-600 rounded-[2.5rem] p-4 shadow-2xl">
                  <div className="bg-white rounded-[2rem] p-8">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="font-bold text-slate-900">Recommended Match</h4>
                        <Badge variant="success">98% Match Score</Badge>
                     </div>
                     <div className="space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                                    <Zap className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Global Medical Supplies</p>
                                    <p className="text-xs text-slate-500">2.4 km away • 15 min ETA</p>
                                </div>
                            </div>
                            <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                        </div>
                        <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <p className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-2">Why ranked #1?</p>
                            <p className="text-xs text-primary-600 leading-normal">
                                Strongest combination of physical proximity and high stock freshness for "Surgical Gloves (M)".
                            </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500 via-transparent to-transparent"></div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-8">Ready to Optimize Your Resource Pipeline?</h2>
              <p className="text-slate-400 text-lg mb-12">Join hundreds of organizations using AVRE to save time and resources when it matters most.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Button size="lg" className="w-full sm:w-auto h-16 px-12 text-lg" onClick={() => window.location.href='/register'}>Create Free Account</Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-12 text-lg border-white/20 text-white hover:bg-white/10">Talk to Sales</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
