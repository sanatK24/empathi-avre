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
  CheckCircle2,
  Heart,
  Sparkles,
  Search,
  Eye
} from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const LandingPage = () => {
  return (
    <div className="overflow-hidden bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 pb-36 md:pt-36 md:pb-48 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary-100/50 rounded-full blur-[140px] opacity-60"></div>
          <div className="absolute bottom-0 left-[-5%] w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[120px] opacity-40"></div>
        </div>

        <div className="container mx-auto text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-600 text-xs font-black uppercase tracking-widest mb-8">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary-500 fill-primary-500 animate-pulse" />
              AI-Powered Crowdfunding & Relief Allocation
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black text-slate-900 leading-[1.05] tracking-tight mb-8 uppercase">
              EmpathI: Intelligence <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-indigo-600">
                For Urgent Care
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              A state-of-the-art fundraising platform combining contextual personalization, 
              robust fraud security, and fairness reranking to ensure critical resources reach 
              those in absolute need.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
              <Button 
                size="lg" 
                className="w-full sm:w-auto text-sm h-14 px-8 uppercase font-black tracking-widest bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/20" 
                onClick={() => window.location.href = '/register'}
              >
                Launch Campaign <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                className="w-full sm:w-auto text-sm h-14 px-8 uppercase font-black tracking-widest bg-white border border-slate-200" 
                onClick={() => window.location.href = '/login'}
              >
                Browse Feed
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative p-4 bg-white/40 backdrop-blur-xl border border-slate-200/50 rounded-[2.5rem] shadow-premium max-w-4xl mx-auto"
          >
            <div className="aspect-[16/9] bg-slate-900 rounded-[2rem] overflow-hidden shadow-inner border border-white/5 relative p-6 sm:p-10 flex flex-col justify-between text-left">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              {/* Mock Dashboard Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary-500/20">
                    E
                  </div>
                  <span className="font-display font-black text-white text-base tracking-widest uppercase">EmpathI Engine</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="ghost" className="bg-white/5 text-primary-400 border border-white/10 uppercase tracking-widest text-[9px]">
                    System Health: 99.9%
                  </Badge>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
              </div>

              {/* Mock Dashboard Grid */}
              <div className="grid grid-cols-12 gap-6 flex-grow pt-8">
                {/* Left side info */}
                <div className="col-span-12 sm:col-span-4 space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">LightGBM Active Feed</p>
                    <p className="text-xl font-black text-white">13 Features Ranked</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">XGBoost Creator Trust</p>
                    <p className="text-xl font-black text-emerald-400">98% Success Prob</p>
                  </div>
                </div>

                {/* Right side recommended campaign mock */}
                <div className="col-span-12 sm:col-span-8 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between group hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[8px] font-black text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20 uppercase tracking-wider">Medical Support</span>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight mt-1.5">Oxygen Concentrators for Mumbai Relief</h3>
                    </div>
                    <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg shrink-0">
                      94% AI Match
                    </span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Fundraising Goal (₹1,50,000)</span>
                        <span>80% Raised</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-white/5 px-3 py-2 rounded-xl">
                      <span className="text-emerald-400">★ Trusted Creator</span>
                      <span>•</span>
                      <span>Mumbai Proximity Match</span>
                      <span>•</span>
                      <span className="text-emerald-400">Verified Document</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28 bg-slate-900 text-white relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500 via-transparent to-transparent"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <span className="text-primary-400 text-xs font-black uppercase tracking-widest">Architectural Innovation</span>
            <h2 className="text-3xl sm:text-5xl font-display font-black uppercase tracking-tight mt-2 mb-4">Core Recommendation Architecture</h2>
            <p className="text-slate-400 max-w-xl mx-auto font-medium text-sm sm:text-base leading-relaxed">
              We leverage modern machine learning and natural language processing layers to balance speed, trust, and resource distribution.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'LightGBM Context Ranker', desc: 'Predicts target success using 13 contextual, engagement, and geographic features for tailored matches.', icon: Target, color: 'border-primary-500/20 text-primary-400' },
              { title: 'XGBoost Trust Engine', desc: 'Analyzes disposable hosts, rapid creation, and past completions to gauge creator risk profiles.', icon: Shield, color: 'border-emerald-500/20 text-emerald-400' },
              { title: 'Fairness Allocation', desc: 'Balances impression metrics to prevent monopolization, ensuring niche and new campaigns gain visibility.', icon: TrendingUp, color: 'border-indigo-500/20 text-indigo-400' },
              { title: 'Multi-Modal NLP Audits', desc: 'Semantic redundancy checking (BGE) and toxicity screening automate campaign verification.', icon: Cpu, color: 'border-amber-500/20 text-amber-400' },
            ].map((f, i) => (
              <Card key={i} className={`p-8 bg-white/5 backdrop-blur-md border ${f.color} hover:ring-2 hover:ring-primary-500/30 transition-all duration-300 rounded-[2rem] flex flex-col justify-between h-full`}>
                <div className="space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 shrink-0">
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white leading-tight">{f.title}</h3>
                  <p className="text-slate-400 font-medium text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-28 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <span className="text-primary-500 text-xs font-black uppercase tracking-widest">Workflow</span>
              <h2 className="text-3xl sm:text-5xl font-display font-black text-slate-900 mt-2 mb-8 uppercase leading-none">
                Decentralized Trust & Smart Delivery
              </h2>
              <div className="space-y-8">
                {[
                  { title: 'Launch & AI Audit', desc: 'Creators upload verification documents. EmpathI instantly extracts urgency values and audits for toxicity, spam risk, and semantic duplicates.' },
                  { title: 'LightGBM Ranking', desc: 'The recommendation engine calculates customized donor match scores based on past giving behaviors, city proximity, and campaign momentum.' },
                  { title: 'Fair Distribution', desc: 'The Fairness Engine adjusts raw scores dynamically against impression counts, bringing high-priority and under-funded campaigns to the discovery page.' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start space-x-5">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-100 text-primary-600 flex items-center justify-center font-black text-sm flex-shrink-0 mt-1">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight mb-1">{step.title}</h4>
                      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div className="bg-white rounded-[2rem] p-6 sm:p-10 text-left">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-display font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base">Creator Trust Scoring</h4>
                    <Badge variant="success" className="px-3 py-1 font-black text-[9px] tracking-wider bg-emerald-50 text-emerald-600 uppercase border border-emerald-100">
                      Fraud Check Passed
                    </Badge>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-primary-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">Composite Score: 96%</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">XGBoost Composite Evaluation</p>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-50 border border-indigo-100/50 rounded-2xl space-y-3">
                      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Audited Trust Factors</p>
                      <div className="grid grid-cols-2 gap-3 text-[9px] text-indigo-600 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Fulfillment: 98%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Low Dispute Prob</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Safe Domain Host</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Age Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="bg-slate-900 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-16 md:p-24 text-center relative overflow-hidden shadow-2xl border border-white/5">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-500 via-transparent to-transparent"></div>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-display font-black text-white uppercase tracking-tight mb-6">
                Be The Catalyst For Fair Change
              </h2>
              <p className="text-slate-400 font-medium text-sm sm:text-base mb-12 max-w-lg mx-auto leading-relaxed">
                Connect your organization, support crucial causes, and ensure absolute transparency inside the humanitarian space.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto h-16 px-12 text-xs uppercase font-black tracking-widest bg-primary-500 hover:bg-primary-600" 
                  onClick={() => window.location.href = '/register'}
                >
                  Create Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
