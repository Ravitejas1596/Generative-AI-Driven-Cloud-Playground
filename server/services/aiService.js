const OpenAI = require('openai');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/ai-service.log' })
  ]
});

class AIService {
  constructor() {
    this.openai = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.initialized = true;
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  async generateInfrastructure(userDescription, preferences = {}) {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    const systemPrompt = `You are an expert cloud infrastructure architect. Generate Terraform configuration based on user requirements.

User Requirements: ${userDescription}

Preferences:
- Cloud Provider: ${preferences.provider || 'AWS'}
- Compliance: ${preferences.compliance || 'standard'}
- Cost Optimization: ${preferences.costOptimization || 'balanced'}
- Environment: ${preferences.environment || 'development'}

Generate a complete Terraform configuration that includes:
1. Provider configuration
2. Resource definitions
3. Security groups and networking
4. Monitoring and logging
5. Cost optimization features
6. Compliance configurations

Return only valid Terraform code with comments explaining each section.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate infrastructure for: ${userDescription}` }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      return {
        terraform: completion.choices[0].message.content,
        explanation: await this.generateExplanation(completion.choices[0].message.content),
        estimatedCost: await this.estimateCost(completion.choices[0].message.content, preferences.provider)
      };
    } catch (error) {
      logger.error('Error generating infrastructure:', error);
      throw new Error('Failed to generate infrastructure configuration');
    }
  }

  async generateExplanation(terraformCode) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: "Explain the Terraform configuration in simple terms, focusing on what each component does and why it's needed." },
          { role: "user", content: `Explain this Terraform code:\n${terraformCode}` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating explanation:', error);
      return 'Unable to generate explanation at this time.';
    }
  }

  async estimateCost(terraformCode, provider = 'AWS') {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: `Estimate the monthly cost for this ${provider} infrastructure. Provide a breakdown by service and total monthly estimate. Be conservative in estimates.` },
          { role: "user", content: `Estimate costs for this Terraform configuration:\n${terraformCode}` }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error estimating cost:', error);
      return 'Cost estimation unavailable at this time.';
    }
  }

  async processChatMessage(message, context = {}) {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    const systemPrompt = `You are a helpful cloud infrastructure assistant. You help users understand and manage their cloud deployments.

Context: ${JSON.stringify(context)}

Provide helpful, accurate, and actionable advice about cloud infrastructure, deployment issues, and best practices.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error processing chat message:', error);
      throw new Error('Failed to process chat message');
    }
  }

  async generateDocumentation(projectData) {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    const systemPrompt = `Generate comprehensive project documentation including:
1. Project overview and architecture
2. Setup and deployment instructions
3. API documentation
4. Troubleshooting guide
5. Security considerations
6. Cost optimization tips

Format the output in Markdown.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate documentation for this project:\n${JSON.stringify(projectData, null, 2)}` }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating documentation:', error);
      throw new Error('Failed to generate documentation');
    }
  }

  async optimizeInfrastructure(terraformCode, optimizationType = 'cost') {
    if (!this.initialized) {
      throw new Error('AI Service not initialized');
    }

    const systemPrompt = `Analyze the Terraform configuration and suggest optimizations for ${optimizationType}.

Focus on:
- Performance improvements
- Cost reduction
- Security enhancements
- Best practices
- Resource efficiency

Provide specific recommendations with code examples.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Optimize this Terraform code for ${optimizationType}:\n${terraformCode}` }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error optimizing infrastructure:', error);
      throw new Error('Failed to optimize infrastructure');
    }
  }

  async generateScreenshots(projectData) {
    // This would integrate with Puppeteer to generate screenshots
    // For now, return a placeholder response
    return {
      message: 'Screenshot generation service would be implemented here',
      screenshots: []
    };
  }
}

// Singleton instance
const aiService = new AIService();

// Initialize function
const initializeAI = async () => {
  await aiService.initialize();
};

module.exports = {
  aiService,
  initializeAI,
  processChatMessage: (message, context) => aiService.processChatMessage(message, context),
  generateInfrastructure: (description, preferences) => aiService.generateInfrastructure(description, preferences),
  generateDocumentation: (projectData) => aiService.generateDocumentation(projectData),
  optimizeInfrastructure: (terraformCode, optimizationType) => aiService.optimizeInfrastructure(terraformCode, optimizationType)
};
