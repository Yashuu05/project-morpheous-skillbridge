import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, CheckCircle2, Zap, TrendingUp, BookOpen, Target, Briefcase } from 'lucide-react';

const SkillBridgeLanding = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#2B2A2A] text-[#F0FFDF]" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-[#2B2A2A] bg-opacity-95 backdrop-blur-md border-b border-[#237227] border-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#237227] rounded-lg flex items-center justify-center">
                <Zap className="text-[#F0FFDF]" size={24} />
              </div>
              <span className="text-xl font-bold text-[#F0FFDF] hidden sm:inline">SkillBridge</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-8">
              {['About', 'Problem', 'Solution', 'How It Works'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                  className="text-[#F0FFDF] hover:text-[#237227] transition-colors duration-300 font-medium text-sm"
                >
                  {item}
                </button>
              ))}
            </div>

            {/* CTA Buttons - Desktop */}
            <div className="hidden md:flex space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-5 py-2 text-[#237227] border border-[#237227] rounded-lg hover:bg-[#237227] hover:text-[#F0FFDF] transition-all duration-300 font-medium text-sm"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-5 py-2 bg-[#237227] text-[#F0FFDF] rounded-lg hover:bg-opacity-80 transition-all duration-300 font-medium text-sm shadow-lg hover:shadow-xl"
              >
                Sign Up
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-[#F0FFDF]"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 animate-in fade-in slide-in-from-top">
              <div className="flex flex-col space-y-3">
                {['About', 'Problem', 'Solution', 'How It Works'].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                    className="text-[#F0FFDF] hover:text-[#237227] transition-colors text-left font-medium py-2"
                  >
                    {item}
                  </button>
                ))}
                <div className="flex flex-col space-y-2 pt-2 border-t border-[#237227] border-opacity-20">
                  <button className="px-4 py-2 text-[#237227] border border-[#237227] rounded-lg text-sm font-medium">
                    Login
                  </button>
                  <button className="px-4 py-2 bg-[#237227] text-[#F0FFDF] rounded-lg text-sm font-medium">
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Animated gradient background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-96 h-96 bg-[#237227] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
              style={{ animation: 'float 6s ease-in-out infinite', top: '10%', left: '10%' }}
            />
            <div
              className="absolute w-96 h-96 bg-[#237227] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
              style={{ animation: 'float 8s ease-in-out infinite reverse', bottom: '10%', right: '10%' }}
            />
          </div>

          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-fade-up">
              <h1 className="text-4xl md:text-6xl font-bold text-[#F0FFDF] mb-6 leading-tight">
                Bridge Your <span className="text-[#237227]">Skills Gap</span>
              </h1>
              <p className="text-lg text-[#F0FFDF] text-opacity-90 mb-8 leading-relaxed">
                Discover exactly what skills you need to master for your dream IT career. Get personalized roadmaps powered by AI-driven assessments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-[#237227] text-[#F0FFDF] px-8 py-4 rounded-lg font-bold hover:bg-opacity-90 transition-all duration-300 shadow-lg hover:shadow-2xl flex items-center justify-center gap-2 group"
                >
                  Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="border-2 border-[#237227] text-[#237227] px-8 py-4 rounded-lg font-bold hover:bg-[#237227] hover:text-[#F0FFDF] transition-all duration-300"
                >
                  Learn More
                </button>
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="animate-float">
                <div className="relative">
                  <img
                    src="/skill_image.jpg"
                    alt="Skill Development Visualization"
                    className="rounded-2xl shadow-2xl border border-[#237227] border-opacity-30 w-full max-w-md mx-auto"
                  />
                  {/* Subtle glow effect behind the image */}
                  <div className="absolute -inset-4 bg-[#237227] opacity-20 blur-2xl rounded-full -z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes fade-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-up {
            animation: fade-up 0.8s ease-out forwards;
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `}</style>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1F1F1F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#F0FFDF] mb-4">About SkillBridge</h2>
            <p className="text-lg text-[#F0FFDF] text-opacity-80 max-w-2xl mx-auto">
              Revolutionizing how IT and Computer Science students understand and develop their professional skills.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Target, title: 'Precise Assessment', desc: 'AI-powered skill detection from your resume and GitHub' },
              { icon: TrendingUp, title: 'Data-Driven Insights', desc: 'Real proficiency scores based on industry standards' },
              { icon: BookOpen, title: 'Custom Learning', desc: 'Personalized roadmaps aligned with your career goals' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-[#2B2A2A] border border-[#237227] border-opacity-30 rounded-xl p-8 hover:border-opacity-60 transition-all duration-300 hover:shadow-xl group"
                style={{ animationDelay: `${idx * 0.2}s` }}
              >
                <div className="bg-[#237227] bg-opacity-20 w-16 h-16 rounded-lg flex items-center justify-center mb-4 group-hover:bg-opacity-40 transition-all">
                  <item.icon size={28} className="text-[#237227]" />
                </div>
                <h3 className="text-xl font-bold text-[#F0FFDF] mb-3">{item.title}</h3>
                <p className="text-[#F0FFDF] text-opacity-75">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#F0FFDF] mb-4">The Problem</h2>
            <p className="text-lg text-[#F0FFDF] text-opacity-80">Why most IT students struggle in their careers</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                {[
                  'Unclear skill gaps between academic knowledge and industry requirements',
                  'No data-driven career guidance tailored to individual strengths',
                  'Lack of structured learning paths for skill development',
                  'Resume and portfolio underutilization in career planning',
                  'Generic job recommendations without skill-match analysis',
                ].map((problem, idx) => (
                  <div key={idx} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#237227] bg-opacity-20">
                        <span className="text-[#237227] font-bold">!</span>
                      </div>
                    </div>
                    <p className="text-[#F0FFDF] text-opacity-90">{problem}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="bg-gradient-to-br from-[#237227] to-[#1a5a1a] rounded-2xl p-12 border border-[#237227] border-opacity-30 shadow-2xl">
                <div className="text-center">
                  <TrendingUp size={64} className="text-[#F0FFDF] mx-auto mb-4 opacity-50" />
                  <p className="text-[#F0FFDF] text-opacity-60">Career growth without direction</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1F1F1F]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#F0FFDF] mb-4">Our Solution</h2>
            <p className="text-lg text-[#F0FFDF] text-opacity-80">Intelligent skill assessment and career planning platform</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative hidden md:block order-2">
              <div className="bg-gradient-to-br from-[#237227] to-[#1a5a1a] rounded-2xl p-12 border border-[#237227] border-opacity-30 shadow-2xl">
                <div className="text-center">
                  <Briefcase size={64} className="text-[#F0FFDF] mx-auto mb-4" />
                  <p className="text-[#F0FFDF]">Precision Career Mapping</p>
                </div>
              </div>
            </div>

            <div className="order-1">
              <div className="space-y-6">
                {[
                  { title: 'Smart Skill Extraction', desc: 'NLP-powered analysis of your resume and GitHub profile' },
                  { title: 'Adaptive Testing', desc: 'Real-time skill assessments with proficiency scoring' },
                  { title: 'AI-Driven Matching', desc: 'Industry-aligned role recommendations using RAG' },
                  { title: 'Gap Analysis', desc: 'Clear visualization of skills you need to acquire' },
                  { title: 'Personalized Roadmap', desc: 'Custom learning plans with specific resources' },
                ].map((solution, idx) => (
                  <div key={idx} className="flex gap-4 animate-fade-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle2 size={24} className="text-[#237227]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F0FFDF] mb-1">{solution.title}</h3>
                      <p className="text-[#F0FFDF] text-opacity-75">{solution.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#F0FFDF] mb-4">How It Works</h2>
            <p className="text-lg text-[#F0FFDF] text-opacity-80">9 steps to your perfect career path</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { step: 1, title: 'Sign Up', desc: 'Create your SkillBridge profile' },
              { step: 2, title: 'Upload Resume', desc: 'Add your resume & GitHub profile' },
              { step: 3, title: 'Skill Extraction', desc: 'AI analyzes your existing skills' },
              { step: 4, title: 'Take Assessment', desc: 'Adaptive skill testing begins' },
              { step: 5, title: 'Get Score', desc: 'Real proficiency metrics calculated' },
              { step: 6, title: 'Find Matches', desc: 'Discover aligned career roles' },
              { step: 7, title: 'Gap Analysis', desc: 'Identify skills to develop' },
              { step: 8, title: 'Rankings', desc: 'Career ranking based on fit' },
              { step: 9, title: 'Get Roadmap', desc: 'Personalized learning plan' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="relative animate-fade-up"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="bg-[#1F1F1F] border border-[#237227] border-opacity-30 rounded-xl p-6 h-full hover:border-opacity-60 transition-all duration-300 hover:shadow-xl group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl font-bold text-[#237227] group-hover:scale-110 transition-transform">{item.step}</div>
                    {idx < 8 && <ArrowRight size={20} className="text-[#237227] opacity-50 hidden lg:block" />}
                  </div>
                  <h3 className="text-xl font-bold text-[#F0FFDF] mb-2">{item.title}</h3>
                  <p className="text-[#F0FFDF] text-opacity-75">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={() => navigate('/signup')}
              className="bg-[#237227] text-[#F0FFDF] px-12 py-4 rounded-lg font-bold hover:bg-opacity-90 transition-all duration-300 shadow-lg hover:shadow-2xl inline-flex items-center gap-2 group"
            >
              Start Your Journey <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F1F1F] border-t border-[#237227] border-opacity-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-[#237227] rounded-lg flex items-center justify-center">
                  <Zap className="text-[#F0FFDF]" size={20} />
                </div>
                <span className="text-lg font-bold text-[#F0FFDF]">SkillBridge</span>
              </div>
              <p className="text-[#F0FFDF] text-opacity-70 text-sm">Bridge your skills gap with AI-powered career guidance.</p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-[#F0FFDF] font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-[#F0FFDF] text-opacity-70">
                <li><button onClick={() => scrollToSection('about')} className="hover:text-[#237227] transition-colors">About</button></li>
                <li><button onClick={() => scrollToSection('problem')} className="hover:text-[#237227] transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#237227] transition-colors">How It Works</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[#F0FFDF] font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-[#F0FFDF] text-opacity-70">
                <li><a href="#" className="hover:text-[#237227] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#237227] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[#237227] transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-[#F0FFDF] font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-[#F0FFDF] text-opacity-70">
                <li><a href="#" className="hover:text-[#237227] transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-[#237227] transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-[#237227] transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#237227] border-opacity-20 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-[#F0FFDF] text-opacity-60">
            <p>&copy; 2024 SkillBridge. All rights reserved.</p>
            <p>Empowering the next generation of IT professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SkillBridgeLanding;
