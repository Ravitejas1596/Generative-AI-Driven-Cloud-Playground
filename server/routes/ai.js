const express = require('express');
const router = express.Router();
const { aiService } = require('../services/aiService');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/ai-routes.log' })
  ]
});

// Generate infrastructure from natural language description
router.post('/generate-infrastructure', authenticateToken, async (req, res) => {
  try {
    const { description, preferences = {} } = req.body;

    if (!description) {
      return res.status(400).json({
        error: 'Description is required'
      });
    }

    logger.info(`Generating infrastructure for user ${req.user.id}: ${description}`);

    const result = await aiService.generateInfrastructure(description, preferences);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating infrastructure:', error);
    res.status(500).json({
      error: 'Failed to generate infrastructure',
      message: error.message
    });
  }
});

// Chat with AI assistant
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    logger.info(`AI chat request from user ${req.user.id}: ${message.substring(0, 100)}...`);

    const response = await aiService.processChatMessage(message, {
      ...context,
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error processing chat message:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message
    });
  }
});

// Generate project documentation
router.post('/generate-documentation', authenticateToken, async (req, res) => {
  try {
    const { projectData } = req.body;

    if (!projectData) {
      return res.status(400).json({
        error: 'Project data is required'
      });
    }

    logger.info(`Generating documentation for user ${req.user.id}`);

    const documentation = await aiService.generateDocumentation({
      ...projectData,
      generatedBy: req.user.id,
      generatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      documentation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating documentation:', error);
    res.status(500).json({
      error: 'Failed to generate documentation',
      message: error.message
    });
  }
});

// Optimize existing infrastructure
router.post('/optimize', authenticateToken, async (req, res) => {
  try {
    const { terraformCode, optimizationType = 'cost' } = req.body;

    if (!terraformCode) {
      return res.status(400).json({
        error: 'Terraform code is required'
      });
    }

    logger.info(`Optimizing infrastructure for user ${req.user.id}, type: ${optimizationType}`);

    const optimization = await aiService.optimizeInfrastructure(terraformCode, optimizationType);

    res.json({
      success: true,
      optimization,
      optimizationType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error optimizing infrastructure:', error);
    res.status(500).json({
      error: 'Failed to optimize infrastructure',
      message: error.message
    });
  }
});

// Generate infrastructure explanation
router.post('/explain', authenticateToken, async (req, res) => {
  try {
    const { terraformCode } = req.body;

    if (!terraformCode) {
      return res.status(400).json({
        error: 'Terraform code is required'
      });
    }

    logger.info(`Explaining infrastructure for user ${req.user.id}`);

    const explanation = await aiService.generateExplanation(terraformCode);

    res.json({
      success: true,
      explanation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error explaining infrastructure:', error);
    res.status(500).json({
      error: 'Failed to explain infrastructure',
      message: error.message
    });
  }
});

// Estimate infrastructure costs
router.post('/estimate-cost', authenticateToken, async (req, res) => {
  try {
    const { terraformCode, provider = 'AWS' } = req.body;

    if (!terraformCode) {
      return res.status(400).json({
        error: 'Terraform code is required'
      });
    }

    logger.info(`Estimating costs for user ${req.user.id}, provider: ${provider}`);

    const costEstimate = await aiService.estimateCost(terraformCode, provider);

    res.json({
      success: true,
      costEstimate,
      provider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error estimating costs:', error);
    res.status(500).json({
      error: 'Failed to estimate costs',
      message: error.message
    });
  }
});

// Generate compliance recommendations
router.post('/compliance-check', authenticateToken, async (req, res) => {
  try {
    const { terraformCode, complianceFramework = 'SOC2' } = req.body;

    if (!terraformCode) {
      return res.status(400).json({
        error: 'Terraform code is required'
      });
    }

    logger.info(`Checking compliance for user ${req.user.id}, framework: ${complianceFramework}`);

    const systemPrompt = `Analyze this Terraform configuration for ${complianceFramework} compliance.

Check for:
1. Security best practices
2. Data encryption requirements
3. Access controls
4. Audit logging
5. Network security
6. Resource tagging
7. Backup and disaster recovery

Provide specific recommendations for compliance improvements.`;

    const completion = await aiService.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Check compliance for this Terraform code:\n${terraformCode}` }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const complianceReport = completion.choices[0].message.content;

    res.json({
      success: true,
      complianceReport,
      framework: complianceFramework,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking compliance:', error);
    res.status(500).json({
      error: 'Failed to check compliance',
      message: error.message
    });
  }
});

// Generate security recommendations
router.post('/security-audit', authenticateToken, async (req, res) => {
  try {
    const { terraformCode } = req.body;

    if (!terraformCode) {
      return res.status(400).json({
        error: 'Terraform code is required'
      });
    }

    logger.info(`Performing security audit for user ${req.user.id}`);

    const systemPrompt = `Perform a comprehensive security audit of this Terraform configuration.

Check for:
1. Publicly accessible resources
2. Insecure configurations
3. Missing encryption
4. Weak access controls
5. Security group misconfigurations
6. IAM policy issues
7. Network security vulnerabilities

Provide a prioritized list of security issues with remediation steps.`;

    const completion = await aiService.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Audit this Terraform code for security issues:\n${terraformCode}` }
      ],
      temperature: 0.1,
      max_tokens: 2500
    });

    const securityAudit = completion.choices[0].message.content;

    res.json({
      success: true,
      securityAudit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error performing security audit:', error);
    res.status(500).json({
      error: 'Failed to perform security audit',
      message: error.message
    });
  }
});

// Generate monitoring and alerting configuration
router.post('/generate-monitoring', authenticateToken, async (req, res) => {
  try {
    const { terraformCode, provider = 'AWS' } = req.body;

    if (!terraformCode) {
      return res.status(400).json({
        error: 'Terraform code is required'
      });
    }

    logger.info(`Generating monitoring config for user ${req.user.id}, provider: ${provider}`);

    const systemPrompt = `Generate comprehensive monitoring and alerting configuration for this ${provider} infrastructure.

Include:
1. CloudWatch/Stackdriver metrics
2. Log aggregation
3. Health checks
4. Performance monitoring
5. Cost monitoring
6. Security monitoring
7. Alert rules and notifications

Provide Terraform code for monitoring resources.`;

    const completion = await aiService.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate monitoring for this Terraform code:\n${terraformCode}` }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const monitoringConfig = completion.choices[0].message.content;

    res.json({
      success: true,
      monitoringConfig,
      provider,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating monitoring config:', error);
    res.status(500).json({
      error: 'Failed to generate monitoring configuration',
      message: error.message
    });
  }
});

module.exports = router;
