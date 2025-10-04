import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Upload,
  Settings,
  MessageCircle,
  Terminal,
  Cloud,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { toast } from 'react-hot-toast';
import './Playground.css';

const Playground = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentLogs, setDeploymentLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  
  // Form states
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('aws');
  const [compliance, setCompliance] = useState('standard');
  const [costOptimization, setCostOptimization] = useState('balanced');
  const [environment, setEnvironment] = useState('development');
  
  // Generated content
  const [generatedInfra, setGeneratedInfra] = useState(null);
  const [terraformCode, setTerraformCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [costEstimate, setCostEstimate] = useState('');
  const [deploymentOutputs, setDeploymentOutputs] = useState(null);
  
  const terminalRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (socket) {
      socket.on('deployment-progress', (data) => {
        setDeploymentProgress(data.progress);
        setDeploymentLogs(prev => [...prev, data.message]);
      });

      socket.on('ai-response', (data) => {
        setChatMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          message: data.message,
          timestamp: data.timestamp
        }]);
      });

      return () => {
        socket.off('deployment-progress');
        socket.off('ai-response');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const steps = [
    { id: 0, title: 'Describe', description: 'Tell us what you want to build' },
    { id: 1, title: 'Generate', description: 'AI creates your infrastructure' },
    { id: 2, title: 'Review', description: 'Review and customize the code' },
    { id: 3, title: 'Deploy', description: 'Deploy to your cloud provider' },
    { id: 4, title: 'Monitor', description: 'Track your deployment' }
  ];

  const handleGenerateInfrastructure = async () => {
    if (!description.trim()) {
      toast.error('Please describe your infrastructure requirements');
      return;
    }

    setIsGenerating(true);
    setCurrentStep(1);
    setDeploymentLogs([{ message: 'Starting AI infrastructure generation...', type: 'info' }]);

    try {
      const response = await fetch('/api/ai/generate-infrastructure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description,
          preferences: {
            provider,
            compliance,
            costOptimization,
            environment
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedInfra(data.data);
        setTerraformCode(data.data.terraform);
        setExplanation(data.data.explanation);
        setCostEstimate(data.data.estimatedCost);
        setCurrentStep(2);
        toast.success('Infrastructure generated successfully!');
        setDeploymentLogs(prev => [...prev, { message: 'Infrastructure generated successfully', type: 'success' }]);
      } else {
        throw new Error(data.error || 'Failed to generate infrastructure');
      }
    } catch (error) {
      console.error('Error generating infrastructure:', error);
      toast.error('Failed to generate infrastructure');
      setDeploymentLogs(prev => [...prev, { message: `Error: ${error.message}`, type: 'error' }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!terraformCode) {
      toast.error('No Terraform code to deploy');
      return;
    }

    setIsDeploying(true);
    setCurrentStep(3);
    setDeploymentProgress(0);
    setDeploymentLogs([{ message: 'Starting deployment...', type: 'info' }]);

    try {
      const response = await fetch('/api/deployments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          projectName: `Generated Project - ${Date.now()}`,
          terraformCode,
          provider,
          environment
        })
      });

      const data = await response.json();

      if (data.success) {
        setDeploymentOutputs(data.outputs);
        setCurrentStep(4);
        toast.success('Deployment completed successfully!');
        setDeploymentLogs(prev => [...prev, { message: 'Deployment completed successfully', type: 'success' }]);
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Error deploying:', error);
      toast.error('Deployment failed');
      setDeploymentLogs(prev => [...prev, { message: `Deployment failed: ${error.message}`, type: 'error' }]);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRollback = async () => {
    setIsRollingBack(true);
    setDeploymentLogs(prev => [...prev, { message: 'Starting rollback...', type: 'info' }]);

    try {
      const response = await fetch('/api/deployments/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          projectId: deploymentOutputs?.projectId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Rollback completed successfully');
        setDeploymentLogs(prev => [...prev, { message: 'Rollback completed successfully', type: 'success' }]);
        setDeploymentOutputs(null);
        setCurrentStep(2);
      } else {
        throw new Error(data.error || 'Rollback failed');
      }
    } catch (error) {
      console.error('Error rolling back:', error);
      toast.error('Rollback failed');
      setDeploymentLogs(prev => [...prev, { message: `Rollback failed: ${error.message}`, type: 'error' }]);
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      type: 'user',
      message: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');

    if (socket) {
      socket.emit('ai-chat', {
        message: chatInput,
        context: {
          currentStep,
          provider,
          terraformCode: terraformCode.substring(0, 500), // Limit context size
          user: user?.username
        }
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="playground">
      <div className="playground-container">
        {/* Header */}
        <div className="playground-header">
          <div className="header-left">
            <h1>Cloud Playground</h1>
            <p>AI-powered infrastructure generation and deployment</p>
          </div>
          
          <div className="header-actions">
            <button
              className="btn btn-ghost"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageCircle className="w-5 h-5" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`step ${currentStep >= step.id ? 'active' : ''} ${
                currentStep === step.id ? 'current' : ''
              }`}
            >
              <div className="step-number">
                {currentStep > step.id ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{step.id + 1}</span>
                )}
              </div>
              <div className="step-content">
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="playground-content">
          {/* Step 0: Describe */}
          {currentStep === 0 && (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card">
                <h2>Describe Your Infrastructure</h2>
                <p>Tell us what you want to build and we'll generate the infrastructure for you.</p>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Infrastructure Description</label>
                    <textarea
                      className="input"
                      placeholder="e.g., I need a scalable web application with a database, load balancer, and auto-scaling capabilities..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Cloud Provider</label>
                      <select
                        className="input"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                      >
                        <option value="aws">Amazon Web Services (AWS)</option>
                        <option value="gcp">Google Cloud Platform (GCP)</option>
                        <option value="azure">Microsoft Azure</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Environment</label>
                      <select
                        className="input"
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                      >
                        <option value="development">Development</option>
                        <option value="staging">Staging</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Compliance Level</label>
                      <select
                        className="input"
                        value={compliance}
                        onChange={(e) => setCompliance(e.target.value)}
                      >
                        <option value="standard">Standard</option>
                        <option value="hipaa">HIPAA</option>
                        <option value="pci">PCI DSS</option>
                        <option value="soc2">SOC 2</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Cost Optimization</label>
                      <select
                        className="input"
                        value={costOptimization}
                        onChange={(e) => setCostOptimization(e.target.value)}
                      >
                        <option value="cost-first">Cost First</option>
                        <option value="balanced">Balanced</option>
                        <option value="performance">Performance First</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleGenerateInfrastructure}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Infrastructure
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Generating */}
          {currentStep === 1 && (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card">
                <h2>Generating Your Infrastructure</h2>
                <p>Our AI is analyzing your requirements and creating the perfect infrastructure setup...</p>
                
                <div className="generation-progress">
                  <div className="progress-bar">
                    <div className="progress-fill"></div>
                  </div>
                  <p>Analyzing requirements and generating Terraform configuration...</p>
                </div>
                
                <div className="terminal-logs">
                  <div className="terminal-header">
                    <Terminal className="w-5 h-5" />
                    <span>Generation Logs</span>
                  </div>
                  <div className="terminal-body">
                    {deploymentLogs.map((log, index) => (
                      <div key={index} className={`log-line ${log.type}`}>
                        <span className="log-timestamp">
                          {new Date().toLocaleTimeString()}
                        </span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="review-grid">
                <div className="review-main">
                  <div className="card">
                    <div className="card-header">
                      <h2>Generated Infrastructure</h2>
                      <div className="card-actions">
                        <button
                          className="btn btn-ghost"
                          onClick={() => copyToClipboard(terraformCode)}
                        >
                          <Copy className="w-4 h-4" />
                          Copy Code
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => setShowLogs(!showLogs)}
                        >
                          {showLogs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showLogs ? 'Hide' : 'Show'} Details
                        </button>
                      </div>
                    </div>
                    
                    <div className="code-editor">
                      <pre><code>{terraformCode}</code></pre>
                    </div>
                  </div>
                  
                  {showLogs && (
                    <div className="card">
                      <h3>AI Explanation</h3>
                      <div className="explanation">
                        <p>{explanation}</p>
                      </div>
                      
                      <h3>Cost Estimate</h3>
                      <div className="cost-estimate">
                        <p>{costEstimate}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="review-sidebar">
                  <div className="card">
                    <h3>Deployment Options</h3>
                    
                    <div className="option-group">
                      <label>Provider: {provider.toUpperCase()}</label>
                    </div>
                    
                    <div className="option-group">
                      <label>Environment: {environment}</label>
                    </div>
                    
                    <div className="option-group">
                      <label>Compliance: {compliance}</label>
                    </div>
                    
                    <div className="option-group">
                      <label>Optimization: {costOptimization}</label>
                    </div>
                    
                    <button
                      className="btn btn-primary btn-large"
                      onClick={handleDeploy}
                      disabled={isDeploying}
                    >
                      {isDeploying ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        <>
                          <Cloud className="w-5 h-5" />
                          Deploy Infrastructure
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Deploying */}
          {currentStep === 3 && (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card">
                <h2>Deploying Your Infrastructure</h2>
                <p>Your infrastructure is being deployed to {provider.toUpperCase()}...</p>
                
                <div className="deployment-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${deploymentProgress}%` }}
                    ></div>
                  </div>
                  <p>{deploymentProgress}% Complete</p>
                </div>
                
                <div className="terminal-logs">
                  <div className="terminal-header">
                    <Terminal className="w-5 h-5" />
                    <span>Deployment Logs</span>
                  </div>
                  <div className="terminal-body" ref={terminalRef}>
                    {deploymentLogs.map((log, index) => (
                      <div key={index} className={`log-line ${log.type}`}>
                        <span className="log-timestamp">
                          {new Date().toLocaleTimeString()}
                        </span>
                        <span className="log-message">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Monitor */}
          {currentStep === 4 && (
            <motion.div
              className="step-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="deployment-complete">
                <div className="card">
                  <div className="success-header">
                    <CheckCircle className="w-16 h-16 text-success" />
                    <h2>Deployment Successful!</h2>
                    <p>Your infrastructure has been deployed successfully to {provider.toUpperCase()}.</p>
                  </div>
                  
                  {deploymentOutputs && (
                    <div className="deployment-outputs">
                      <h3>Deployment Outputs</h3>
                      <pre><code>{JSON.stringify(deploymentOutputs, null, 2)}</code></pre>
                    </div>
                  )}
                  
                  <div className="deployment-actions">
                    <button
                      className="btn btn-danger"
                      onClick={handleRollback}
                      disabled={isRollingBack}
                    >
                      {isRollingBack ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Rolling Back...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-5 h-5" />
                          Rollback Deployment
                        </>
                      )}
                    </button>
                    
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentStep(0)}
                    >
                      <Play className="w-5 h-5" />
                      Deploy Another
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* AI Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              className="chat-sidebar"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="chat-header">
                <h3>AI Assistant</h3>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowChat(false)}
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
              
              <div className="chat-messages" ref={chatRef}>
                {chatMessages.length === 0 && (
                  <div className="chat-welcome">
                    <MessageCircle className="w-8 h-8" />
                    <p>Hi! I'm your AI assistant. Ask me anything about your infrastructure or deployment.</p>
                  </div>
                )}
                
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message ${message.type}`}
                  >
                    <div className="message-content">
                      <p>{message.message}</p>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleChatSubmit} className="chat-input">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Playground;
