const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { cloudService } = require('../services/cloudService');
const { aiService } = require('../services/aiService');
const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/deployments.log' })
  ]
});

// Deployment Schema
const deploymentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  provider: { type: String, enum: ['aws', 'gcp', 'azure'], required: true },
  terraformCode: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'deploying', 'deployed', 'failed', 'rolling_back', 'rolled_back'], 
    default: 'pending' 
  },
  outputs: { type: Object, default: {} },
  logs: [{ 
    message: String, 
    type: { type: String, enum: ['info', 'success', 'error', 'warning'] },
    timestamp: { type: Date, default: Date.now }
  }],
  costEstimate: { type: Object },
  deploymentTime: { type: Number }, // in seconds
  createdAt: { type: Date, default: Date.now },
  deployedAt: { type: Date },
  rolledBackAt: { type: Date }
});

const Deployment = mongoose.model('Deployment', deploymentSchema);

// Create a new deployment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, projectName, terraformCode, provider, environment } = req.body;

    if (!terraformCode || !provider) {
      return res.status(400).json({
        error: 'Terraform code and provider are required'
      });
    }

    // Validate infrastructure
    const validation = await cloudService.validateInfrastructure(terraformCode, provider);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid Terraform configuration',
        details: validation.error
      });
    }

    // Create deployment record
    const deployment = new Deployment({
      projectId: projectId || new mongoose.Types.ObjectId(),
      userId: req.user.id,
      name: projectName || `Deployment ${Date.now()}`,
      provider,
      terraformCode,
      status: 'pending'
    });

    await deployment.save();

    logger.info(`Deployment created: ${deployment._id} by user ${req.user.id}`);

    // Start deployment process
    setImmediate(async () => {
      try {
        await processDeployment(deployment._id);
      } catch (error) {
        logger.error(`Deployment processing error: ${error.message}`);
      }
    });

    res.status(201).json({
      success: true,
      deployment,
      message: 'Deployment started successfully'
    });
  } catch (error) {
    logger.error('Error creating deployment:', error);
    res.status(500).json({
      error: 'Failed to create deployment',
      message: error.message
    });
  }
});

// Get all deployments for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, provider } = req.query;
    const filter = { userId: req.user.id };

    if (status) filter.status = status;
    if (provider) filter.provider = provider;

    const deployments = await Deployment.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('projectId', 'name description')
      .exec();

    const total = await Deployment.countDocuments(filter);

    res.json({
      success: true,
      deployments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching deployments:', error);
    res.status(500).json({
      error: 'Failed to fetch deployments',
      message: error.message
    });
  }
});

// Get a specific deployment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('projectId', 'name description');

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    res.json({
      success: true,
      deployment
    });
  } catch (error) {
    logger.error('Error fetching deployment:', error);
    res.status(500).json({
      error: 'Failed to fetch deployment',
      message: error.message
    });
  }
});

// Get deployment logs
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('logs status');

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    res.json({
      success: true,
      logs: deployment.logs,
      status: deployment.status
    });
  } catch (error) {
    logger.error('Error fetching deployment logs:', error);
    res.status(500).json({
      error: 'Failed to fetch deployment logs',
      message: error.message
    });
  }
});

// Get deployment status
router.get('/:id/status', authenticateToken, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).select('status outputs deploymentTime deployedAt');

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    // Get live status from cloud provider if deployed
    let liveStatus = null;
    if (deployment.status === 'deployed' && deployment.outputs?.projectId) {
      try {
        liveStatus = await cloudService.getDeploymentStatus(deployment.outputs.projectId);
      } catch (error) {
        logger.warn(`Failed to get live status: ${error.message}`);
      }
    }

    res.json({
      success: true,
      status: deployment.status,
      outputs: deployment.outputs,
      deploymentTime: deployment.deploymentTime,
      deployedAt: deployment.deployedAt,
      liveStatus
    });
  } catch (error) {
    logger.error('Error fetching deployment status:', error);
    res.status(500).json({
      error: 'Failed to fetch deployment status',
      message: error.message
    });
  }
});

// Rollback deployment
router.post('/rollback', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required'
      });
    }

    const deployment = await Deployment.findOne({
      projectId,
      userId: req.user.id,
      status: 'deployed'
    });

    if (!deployment) {
      return res.status(404).json({
        error: 'No active deployment found for rollback'
      });
    }

    // Update deployment status
    deployment.status = 'rolling_back';
    await deployment.save();

    logger.info(`Rollback initiated for deployment: ${deployment._id}`);

    // Start rollback process
    setImmediate(async () => {
      try {
        await processRollback(deployment._id);
      } catch (error) {
        logger.error(`Rollback processing error: ${error.message}`);
      }
    });

    res.json({
      success: true,
      message: 'Rollback initiated successfully',
      deploymentId: deployment._id
    });
  } catch (error) {
    logger.error('Error initiating rollback:', error);
    res.status(500).json({
      error: 'Failed to initiate rollback',
      message: error.message
    });
  }
});

// Get deployment cost estimate
router.get('/:id/cost', authenticateToken, async (req, res) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    let costEstimate = deployment.costEstimate;

    // If no stored estimate, generate one
    if (!costEstimate) {
      try {
        costEstimate = await cloudService.getCostEstimate(deployment.projectId);
      } catch (error) {
        logger.warn(`Failed to get cost estimate: ${error.message}`);
        costEstimate = { error: 'Cost estimation unavailable' };
      }
    }

    res.json({
      success: true,
      costEstimate
    });
  } catch (error) {
    logger.error('Error fetching cost estimate:', error);
    res.status(500).json({
      error: 'Failed to fetch cost estimate',
      message: error.message
    });
  }
});

// Delete deployment record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deployment = await Deployment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found'
      });
    }

    logger.info(`Deployment deleted: ${deployment._id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Deployment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting deployment:', error);
    res.status(500).json({
      error: 'Failed to delete deployment',
      message: error.message
    });
  }
});

// Process deployment (background job)
async function processDeployment(deploymentId) {
  const deployment = await Deployment.findById(deploymentId);
  if (!deployment) return;

  const startTime = Date.now();

  try {
    // Update status to deploying
    deployment.status = 'deploying';
    deployment.logs.push({
      message: 'Starting deployment process...',
      type: 'info'
    });
    await deployment.save();

    // Deploy infrastructure
    const result = await cloudService.deployInfrastructure(
      deployment.projectId.toString(),
      deployment.terraformCode,
      deployment.provider
    );

    if (result.success) {
      deployment.status = 'deployed';
      deployment.outputs = result.outputs;
      deployment.deployedAt = new Date();
      deployment.deploymentTime = Math.round((Date.now() - startTime) / 1000);
      deployment.logs.push({
        message: 'Deployment completed successfully',
        type: 'success'
      });

      // Get cost estimate
      try {
        deployment.costEstimate = await cloudService.getCostEstimate(deployment.projectId.toString());
      } catch (error) {
        logger.warn(`Failed to get cost estimate for deployment ${deploymentId}: ${error.message}`);
      }
    } else {
      throw new Error(result.message || 'Deployment failed');
    }
  } catch (error) {
    deployment.status = 'failed';
    deployment.logs.push({
      message: `Deployment failed: ${error.message}`,
      type: 'error'
    });
    logger.error(`Deployment ${deploymentId} failed: ${error.message}`);
  }

  await deployment.save();
}

// Process rollback (background job)
async function processRollback(deploymentId) {
  const deployment = await Deployment.findById(deploymentId);
  if (!deployment) return;

  try {
    deployment.logs.push({
      message: 'Starting rollback process...',
      type: 'info'
    });
    await deployment.save();

    // Rollback infrastructure
    const result = await cloudService.rollbackDeployment(deployment.projectId.toString());

    if (result.success) {
      deployment.status = 'rolled_back';
      deployment.rolledBackAt = new Date();
      deployment.logs.push({
        message: 'Rollback completed successfully',
        type: 'success'
      });
    } else {
      throw new Error(result.message || 'Rollback failed');
    }
  } catch (error) {
    deployment.status = 'failed';
    deployment.logs.push({
      message: `Rollback failed: ${error.message}`,
      type: 'error'
    });
    logger.error(`Rollback ${deploymentId} failed: ${error.message}`);
  }

  await deployment.save();
}

module.exports = router;
