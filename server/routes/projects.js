const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/projects-routes.log' })
  ]
});

// Project Schema
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  terraformCode: { type: String },
  provider: { type: String, enum: ['aws', 'gcp', 'azure'], default: 'aws' },
  status: { 
    type: String, 
    enum: ['draft', 'generated', 'deployed', 'failed', 'rolled_back'], 
    default: 'draft' 
  },
  deploymentOutputs: { type: Object, default: {} },
  costEstimate: { type: Object },
  complianceSettings: { type: Object, default: {} },
  optimizationSettings: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deployedAt: { type: Date },
  lastDeploymentId: { type: String }
});

const Project = mongoose.model('Project', projectSchema);

// Create a new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, provider = 'aws' } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: 'Name and description are required'
      });
    }

    const project = new Project({
      name,
      description,
      userId: req.user.id,
      provider
    });

    await project.save();

    logger.info(`Project created: ${project._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      project,
      message: 'Project created successfully'
    });
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message
    });
  }
});

// Get all projects for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, provider } = req.query;
    const filter = { userId: req.user.id };

    if (status) filter.status = status;
    if (provider) filter.provider = provider;

    const projects = await Project.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'username email')
      .exec();

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// Get a specific project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('userId', 'username email');

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    logger.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message
    });
  }
});

// Update a project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, terraformCode, provider, complianceSettings, optimizationSettings } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (terraformCode) updateData.terraformCode = terraformCode;
    if (provider) updateData.provider = provider;
    if (complianceSettings) updateData.complianceSettings = complianceSettings;
    if (optimizationSettings) updateData.optimizationSettings = optimizationSettings;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    logger.info(`Project updated: ${project._id} by user ${req.user.id}`);

    res.json({
      success: true,
      project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    logger.error('Error updating project:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// Update project status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, deploymentOutputs, costEstimate } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (status === 'deployed') {
      updateData.deployedAt = new Date();
    }

    if (deploymentOutputs) updateData.deploymentOutputs = deploymentOutputs;
    if (costEstimate) updateData.costEstimate = costEstimate;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    logger.info(`Project status updated: ${project._id} to ${status} by user ${req.user.id}`);

    res.json({
      success: true,
      project,
      message: 'Project status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating project status:', error);
    res.status(500).json({
      error: 'Failed to update project status',
      message: error.message
    });
  }
});

// Delete a project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    logger.info(`Project deleted: ${project._id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

// Clone a project
router.post('/:id/clone', authenticateToken, async (req, res) => {
  try {
    const originalProject = await Project.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!originalProject) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const clonedProject = new Project({
      name: `${originalProject.name} (Clone)`,
      description: originalProject.description,
      userId: req.user.id,
      terraformCode: originalProject.terraformCode,
      provider: originalProject.provider,
      complianceSettings: originalProject.complianceSettings,
      optimizationSettings: originalProject.optimizationSettings,
      status: 'draft'
    });

    await clonedProject.save();

    logger.info(`Project cloned: ${originalProject._id} -> ${clonedProject._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      project: clonedProject,
      message: 'Project cloned successfully'
    });
  } catch (error) {
    logger.error('Error cloning project:', error);
    res.status(500).json({
      error: 'Failed to clone project',
      message: error.message
    });
  }
});

// Get project statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Project.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          deployed: { $sum: { $cond: [{ $eq: ['$status', 'deployed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          aws: { $sum: { $cond: [{ $eq: ['$provider', 'aws'] }, 1, 0] } },
          gcp: { $sum: { $cond: [{ $eq: ['$provider', 'gcp'] }, 1, 0] } },
          azure: { $sum: { $cond: [{ $eq: ['$provider', 'azure'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      deployed: 0,
      failed: 0,
      draft: 0,
      aws: 0,
      gcp: 0,
      azure: 0
    };

    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    logger.error('Error fetching project stats:', error);
    res.status(500).json({
      error: 'Failed to fetch project statistics',
      message: error.message
    });
  }
});

// Export project configuration
router.get('/:id/export', authenticateToken, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (format === 'terraform') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}.tf"`);
      res.send(project.terraformCode || '');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}.json"`);
      res.json(project);
    }
  } catch (error) {
    logger.error('Error exporting project:', error);
    res.status(500).json({
      error: 'Failed to export project',
      message: error.message
    });
  }
});

module.exports = router;
