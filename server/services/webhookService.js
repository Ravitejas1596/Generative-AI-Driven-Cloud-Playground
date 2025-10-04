const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/webhook-service.log' })
  ]
});

class WebhookService {
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL;
  }

  async sendSlackNotification(message, level = 'info', metadata = {}) {
    if (!this.slackWebhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const colors = {
        info: '#36a64f',
        success: '#36a64f',
        warning: '#ff9500',
        error: '#ff0000'
      };

      const emojis = {
        info: ':information_source:',
        success: ':white_check_mark:',
        warning: ':warning:',
        error: ':x:'
      };

      const payload = {
        text: `${emojis[level]} Cloud Playground Alert`,
        attachments: [
          {
            color: colors[level],
            fields: [
              {
                title: 'Message',
                value: message,
                short: false
              },
              {
                title: 'Level',
                value: level.toUpperCase(),
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              }
            ]
          }
        ]
      };

      // Add metadata fields
      Object.entries(metadata).forEach(([key, value]) => {
        payload.attachments[0].fields.push({
          title: key,
          value: String(value),
          short: true
        });
      });

      await axios.post(this.slackWebhookUrl, payload);
      logger.info('Slack notification sent successfully');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  }

  async sendTeamsNotification(message, level = 'info', metadata = {}) {
    if (!this.teamsWebhookUrl) {
      logger.warn('Teams webhook URL not configured');
      return;
    }

    try {
      const colors = {
        info: '28a745',
        success: '28a745',
        warning: 'ffc107',
        error: 'dc3545'
      };

      const emojis = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      };

      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: colors[level],
        summary: 'Cloud Playground Notification',
        sections: [
          {
            activityTitle: `${emojis[level]} Cloud Playground Alert`,
            activitySubtitle: message,
            facts: [
              {
                name: 'Level',
                value: level.toUpperCase()
              },
              {
                name: 'Timestamp',
                value: new Date().toISOString()
              },
              ...Object.entries(metadata).map(([key, value]) => ({
                name: key,
                value: String(value)
              }))
            ]
          }
        ]
      };

      await axios.post(this.teamsWebhookUrl, payload);
      logger.info('Teams notification sent successfully');
    } catch (error) {
      logger.error('Failed to send Teams notification:', error);
    }
  }

  async sendDeploymentNotification(deployment, status) {
    const message = `Deployment ${status}: ${deployment.name}`;
    const metadata = {
      'Project ID': deployment.projectId,
      'Provider': deployment.provider,
      'Environment': deployment.environment || 'production',
      'User': deployment.userId
    };

    await Promise.all([
      this.sendSlackNotification(message, status === 'completed' ? 'success' : 'error', metadata),
      this.sendTeamsNotification(message, status === 'completed' ? 'success' : 'error', metadata)
    ]);
  }

  async sendSecurityAlert(alert) {
    const message = `Security Alert: ${alert.title}`;
    const metadata = {
      'Severity': alert.severity,
      'Type': alert.type,
      'Resource': alert.resource,
      'User': alert.userId
    };

    await Promise.all([
      this.sendSlackNotification(message, 'error', metadata),
      this.sendTeamsNotification(message, 'error', metadata)
    ]);
  }

  async sendCostAlert(costData) {
    const message = `Cost Alert: Budget threshold exceeded`;
    const metadata = {
      'Current Cost': `$${costData.currentCost}`,
      'Budget': `$${costData.budget}`,
      'Threshold': `${costData.threshold}%`,
      'Project': costData.projectId
    };

    await Promise.all([
      this.sendSlackNotification(message, 'warning', metadata),
      this.sendTeamsNotification(message, 'warning', metadata)
    ]);
  }

  async sendComplianceReport(report) {
    const message = `Compliance Report: ${report.framework} assessment completed`;
    const metadata = {
      'Framework': report.framework,
      'Status': report.status,
      'Score': `${report.score}%`,
      'Issues Found': report.issuesCount,
      'Project': report.projectId
    };

    await Promise.all([
      this.sendSlackNotification(message, report.status === 'compliant' ? 'success' : 'warning', metadata),
      this.sendTeamsNotification(message, report.status === 'compliant' ? 'success' : 'warning', metadata)
    ]);
  }
}

// Singleton instance
const webhookService = new WebhookService();

// Initialize function
const initializeWebhooks = async () => {
  logger.info('Webhook service initialized');
};

module.exports = {
  webhookService,
  initializeWebhooks
};
