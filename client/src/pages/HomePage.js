import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Terminal, 
  Cloud, 
  Zap, 
  Shield, 
  Code, 
  Rocket,
  ArrowRight,
  Play,
  Github,
  Twitter,
  Linkedin
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matrixChars, setMatrixChars] = useState([]);

  useEffect(() => {
    // Generate matrix rain effect
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';
    const matrix = [];
    
    for (let i = 0; i < 100; i++) {
      matrix.push({
        char: chars[Math.floor(Math.random() * chars.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        speed: Math.random() * 2 + 0.5
      });
    }
    
    setMatrixChars(matrix);
  }, []);

  const features = [
    {
      icon: <Terminal className="w-8 h-8" />,
      title: "AI-Powered Infrastructure",
      description: "Describe your needs in plain English and watch as our AI generates complete Terraform configurations.",
      color: "var(--primary-green)"
    },
    {
      icon: <Cloud className="w-8 h-8" />,
      title: "Multi-Cloud Support",
      description: "Deploy to AWS, GCP, or Azure with a single click. Switch between providers seamlessly.",
      color: "var(--primary-blue)"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Deployment",
      description: "From idea to deployed infrastructure in minutes. No complex setup or configuration required.",
      color: "var(--primary-yellow)"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Security First",
      description: "Built-in security best practices, compliance checks, and automated vulnerability scanning.",
      color: "var(--primary-red)"
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: "Smart Optimization",
      description: "AI-driven cost optimization and performance tuning for your cloud infrastructure.",
      color: "var(--secondary-green)"
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: "Live Support",
      description: "Get instant help from our AI assistant or connect with our expert team.",
      color: "var(--secondary-blue)"
    }
  ];

  const stats = [
    { label: "Active Deployments", value: "10,000+" },
    { label: "Infrastructure Templates", value: "500+" },
    { label: "Cloud Providers", value: "3" },
    { label: "Uptime", value: "99.9%" }
  ];

  return (
    <div className="homepage">
      {/* Matrix Background */}
      <div className="matrix-bg">
        {matrixChars.map((char, index) => (
          <motion.div
            key={index}
            className="matrix-char"
            style={{
              left: `${char.x}%`,
              top: `${char.y}%`,
            }}
            animate={{
              y: [0, 100],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          >
            {char.char}
          </motion.div>
        ))}
      </div>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="hero-title"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Generative AI-Driven
              <span className="glitch" data-text="Cloud Playground">
                Cloud Playground
              </span>
            </motion.h1>
            
            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Transform your cloud infrastructure ideas into reality with AI-powered automation.
              Deploy, manage, and optimize your cloud resources with just a description.
            </motion.p>

            <motion.div
              className="hero-actions"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate(user ? '/playground' : '/register')}
              >
                <Play className="w-5 h-5" />
                {user ? 'Launch Playground' : 'Get Started Free'}
                <ArrowRight className="w-5 h-5" />
              </button>
              
              <button
                className="btn btn-secondary btn-large"
                onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}
              >
                Watch Demo
              </button>
            </motion.div>

            <motion.div
              className="hero-stats"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {stats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="terminal-demo">
              <div className="terminal-header">
                <div className="terminal-dot red"></div>
                <div className="terminal-dot yellow"></div>
                <div className="terminal-dot green"></div>
                <span className="terminal-title">Cloud Playground Terminal</span>
              </div>
              <div className="terminal-body">
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span>Describe your infrastructure...</span>
                </div>
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span className="text-accent">"I need a scalable web application with a database"</span>
                </div>
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span className="text-success">✓ Generating Terraform configuration...</span>
                </div>
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span className="text-success">✓ Deploying to AWS...</span>
                </div>
                <div className="terminal-line">
                  <span className="terminal-prompt">$</span>
                  <span className="text-success">✓ Infrastructure deployed successfully!</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2>Powerful Features for Modern Infrastructure</h2>
            <p>Everything you need to build, deploy, and manage cloud infrastructure at scale.</p>
          </motion.div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: `0 0 30px ${feature.color}40`
                }}
              >
                <div 
                  className="feature-icon"
                  style={{ color: feature.color }}
                >
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="demo">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2>See It In Action</h2>
            <p>Watch how easy it is to deploy infrastructure with AI assistance.</p>
          </motion.div>

          <motion.div
            className="demo-video"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="video-placeholder">
              <Play className="w-16 h-16" />
              <p>Demo Video Coming Soon</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <motion.div
            className="cta-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2>Ready to Transform Your Cloud Infrastructure?</h2>
            <p>Join thousands of developers who are already building faster with AI-powered cloud automation.</p>
            
            <div className="cta-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={() => navigate(user ? '/dashboard' : '/register')}
              >
                {user ? 'Go to Dashboard' : 'Start Building Now'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>Cloud Playground</h3>
              <p>AI-powered cloud infrastructure automation platform.</p>
            </div>
            
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#demo">Demo</a>
                <a href="/pricing">Pricing</a>
                <a href="/docs">Documentation</a>
              </div>
              
              <div className="footer-column">
                <h4>Company</h4>
                <a href="/about">About</a>
                <a href="/blog">Blog</a>
                <a href="/careers">Careers</a>
                <a href="/contact">Contact</a>
              </div>
              
              <div className="footer-column">
                <h4>Support</h4>
                <a href="/help">Help Center</a>
                <a href="/community">Community</a>
                <a href="/status">Status</a>
                <a href="/security">Security</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 Cloud Playground. All rights reserved.</p>
            <div className="social-links">
              <a href="https://github.com" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
