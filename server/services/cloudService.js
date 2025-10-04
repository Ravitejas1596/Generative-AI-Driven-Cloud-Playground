const AWS = require('aws-sdk');
const { Compute } = require('@google-cloud/compute');
const { ComputeManagementClient } = require('@azure/arm-compute');
const { DefaultAzureCredential } = require('@azure/identity');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/cloud-service.log' })
  ]
});

const execAsync = promisify(exec);

class CloudService {
  constructor() {
    this.awsConfig = null;
    this.gcpConfig = null;
    this.azureConfig = null;
    this.terraformPath = path.join(__dirname, '../terraform');
  }

  async initialize() {
    try {
      // Initialize AWS
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        AWS.config.update({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        });
        this.awsConfig = {
          ec2: new AWS.EC2(),
          s3: new AWS.S3(),
          rds: new AWS.RDS(),
          lambda: new AWS.Lambda(),
          cloudFormation: new AWS.CloudFormation()
        };
        logger.info('AWS services initialized');
      }

      // Initialize GCP
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.gcpConfig = {
          compute: new Compute({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
          })
        };
        logger.info('GCP services initialized');
      }

      // Initialize Azure
      if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
        const credential = new DefaultAzureCredential();
        this.azureConfig = {
          compute: new ComputeManagementClient(credential, process.env.AZURE_SUBSCRIPTION_ID)
        };
        logger.info('Azure services initialized');
      }

      // Ensure terraform directory exists
      await fs.mkdir(this.terraformPath, { recursive: true });
      
      logger.info('Cloud Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Cloud Service:', error);
      throw error;
    }
  }

  async deployInfrastructure(projectId, terraformCode, provider = 'aws') {
    try {
      const projectPath = path.join(this.terraformPath, projectId);
      await fs.mkdir(projectPath, { recursive: true });

      // Write Terraform files
      await fs.writeFile(path.join(projectPath, 'main.tf'), terraformCode);
      await this.generateProviderConfig(projectPath, provider);
      await this.generateVariablesFile(projectPath, provider);

      // Initialize Terraform
      await execAsync('terraform init', { cwd: projectPath });

      // Plan deployment
      const { stdout: planOutput } = await execAsync('terraform plan -out=tfplan', { cwd: projectPath });

      // Apply deployment
      const { stdout: applyOutput } = await execAsync('terraform apply -auto-approve tfplan', { cwd: projectPath });

      // Get outputs
      const { stdout: output } = await execAsync('terraform output -json', { cwd: projectPath });
      const outputs = JSON.parse(output);

      logger.info(`Infrastructure deployed successfully for project ${projectId}`);

      return {
        success: true,
        outputs,
        planOutput,
        applyOutput
      };
    } catch (error) {
      logger.error(`Deployment failed for project ${projectId}:`, error);
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async rollbackDeployment(projectId) {
    try {
      const projectPath = path.join(this.terraformPath, projectId);
      
      if (!await this.pathExists(projectPath)) {
        throw new Error('Project path does not exist');
      }

      // Destroy infrastructure
      const { stdout: destroyOutput } = await execAsync('terraform destroy -auto-approve', { cwd: projectPath });

      logger.info(`Infrastructure rolled back successfully for project ${projectId}`);

      return {
        success: true,
        message: 'Infrastructure rolled back successfully',
        destroyOutput
      };
    } catch (error) {
      logger.error(`Rollback failed for project ${projectId}:`, error);
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  async getDeploymentStatus(projectId) {
    try {
      const projectPath = path.join(this.terraformPath, projectId);
      
      if (!await this.pathExists(projectPath)) {
        return { status: 'not_deployed' };
      }

      // Check Terraform state
      const { stdout: stateOutput } = await execAsync('terraform show -json', { cwd: projectPath });
      const state = JSON.parse(stateOutput);

      // Get current resources
      const resources = state.values?.root_module?.resources || [];

      return {
        status: 'deployed',
        resources,
        resourceCount: resources.length
      };
    } catch (error) {
      logger.error(`Failed to get deployment status for project ${projectId}:`, error);
      return { status: 'error', error: error.message };
    }
  }

  async getCostEstimate(projectId) {
    try {
      const projectPath = path.join(this.terraformPath, projectId);
      
      if (!await this.pathExists(projectPath)) {
        return { error: 'Project not found' };
      }

      // This would integrate with cloud provider cost APIs
      // For now, return a mock estimate
      return {
        monthlyEstimate: '$150.00',
        breakdown: [
          { service: 'EC2 Instances', cost: '$80.00' },
          { service: 'RDS Database', cost: '$40.00' },
          { service: 'S3 Storage', cost: '$20.00' },
          { service: 'Load Balancer', cost: '$10.00' }
        ],
        currency: 'USD'
      };
    } catch (error) {
      logger.error(`Failed to get cost estimate for project ${projectId}:`, error);
      return { error: error.message };
    }
  }

  async validateInfrastructure(terraformCode, provider) {
    try {
      const tempPath = path.join(this.terraformPath, 'temp-validation');
      await fs.mkdir(tempPath, { recursive: true });

      // Write Terraform files
      await fs.writeFile(path.join(tempPath, 'main.tf'), terraformCode);
      await this.generateProviderConfig(tempPath, provider);

      // Validate syntax
      await execAsync('terraform init', { cwd: tempPath });
      const { stdout: validateOutput } = await execAsync('terraform validate', { cwd: tempPath });

      // Clean up
      await this.cleanupDirectory(tempPath);

      return {
        valid: true,
        message: 'Terraform configuration is valid'
      };
    } catch (error) {
      logger.error('Infrastructure validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async generateProviderConfig(projectPath, provider) {
    let providerConfig = '';

    switch (provider.toLowerCase()) {
      case 'aws':
        providerConfig = `
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
        `;
        break;
      case 'gcp':
        providerConfig = `
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}
        `;
        break;
      case 'azure':
        providerConfig = `
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
        `;
        break;
    }

    await fs.writeFile(path.join(projectPath, 'providers.tf'), providerConfig);
  }

  async generateVariablesFile(projectPath, provider) {
    let variablesConfig = '';

    switch (provider.toLowerCase()) {
      case 'aws':
        variablesConfig = `
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
        `;
        break;
      case 'gcp':
        variablesConfig = `
variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
        `;
        break;
      case 'azure':
        variablesConfig = `
variable "azure_location" {
  description = "Azure location"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
        `;
        break;
    }

    await fs.writeFile(path.join(projectPath, 'variables.tf'), variablesConfig);
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async cleanupDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Failed to cleanup directory ${dirPath}:`, error);
    }
  }

  // Cloud provider specific methods
  async getAWSResources(region = 'us-east-1') {
    if (!this.awsConfig) {
      throw new Error('AWS not configured');
    }

    try {
      const ec2 = new AWS.EC2({ region });
      const { Reservations } = await ec2.describeInstances().promise();
      
      return {
        instances: Reservations.flatMap(r => r.Instances),
        region
      };
    } catch (error) {
      logger.error('Failed to get AWS resources:', error);
      throw error;
    }
  }

  async getGCPResources(projectId) {
    if (!this.gcpConfig) {
      throw new Error('GCP not configured');
    }

    try {
      const [instances] = await this.gcpConfig.compute.getInstances({
        project: projectId,
        zone: 'us-central1-a'
      });

      return {
        instances: instances || [],
        projectId
      };
    } catch (error) {
      logger.error('Failed to get GCP resources:', error);
      throw error;
    }
  }

  async getAzureResources(subscriptionId) {
    if (!this.azureConfig) {
      throw new Error('Azure not configured');
    }

    try {
      const virtualMachines = [];
      const result = this.azureConfig.compute.virtualMachines.list(subscriptionId);
      
      for await (const vm of result) {
        virtualMachines.push(vm);
      }

      return {
        virtualMachines,
        subscriptionId
      };
    } catch (error) {
      logger.error('Failed to get Azure resources:', error);
      throw error;
    }
  }
}

// Singleton instance
const cloudService = new CloudService();

// Initialize function
const initializeCloudProviders = async () => {
  await cloudService.initialize();
};

module.exports = {
  cloudService,
  initializeCloudProviders,
  deployInfrastructure: (projectId, terraformCode, provider) => cloudService.deployInfrastructure(projectId, terraformCode, provider),
  rollbackDeployment: (projectId) => cloudService.rollbackDeployment(projectId),
  getDeploymentStatus: (projectId) => cloudService.getDeploymentStatus(projectId),
  getCostEstimate: (projectId) => cloudService.getCostEstimate(projectId),
  validateInfrastructure: (terraformCode, provider) => cloudService.validateInfrastructure(terraformCode, provider)
};
