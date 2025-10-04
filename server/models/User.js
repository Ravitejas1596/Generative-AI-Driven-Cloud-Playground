const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'dark'
    },
    defaultProvider: {
      type: String,
      enum: ['aws', 'gcp', 'azure'],
      default: 'aws'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      deployment: {
        type: Boolean,
        default: true
      },
      security: {
        type: Boolean,
        default: true
      }
    }
  },
  cloudCredentials: {
    aws: {
      accessKeyId: String,
      secretAccessKey: String,
      region: {
        type: String,
        default: 'us-east-1'
      },
      configured: {
        type: Boolean,
        default: false
      }
    },
    gcp: {
      projectId: String,
      keyFile: String,
      region: {
        type: String,
        default: 'us-central1'
      },
      configured: {
        type: Boolean,
        default: false
      }
    },
    azure: {
      subscriptionId: String,
      clientId: String,
      clientSecret: String,
      tenantId: String,
      region: {
        type: String,
        default: 'East US'
      },
      configured: {
        type: Boolean,
        default: false
      }
    }
  },
  apiKeys: [{
    name: String,
    key: String,
    permissions: [String],
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date,
    expiresAt: Date
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date
  },
  usage: {
    deploymentsThisMonth: {
      type: Number,
      default: 0
    },
    aiRequestsThisMonth: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hide sensitive fields in JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.cloudCredentials;
  delete userObject.apiKeys;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

// Check if user has cloud provider configured
userSchema.methods.hasCloudProvider = function(provider) {
  return this.cloudCredentials[provider] && this.cloudCredentials[provider].configured;
};

// Get available cloud providers
userSchema.methods.getAvailableProviders = function() {
  const providers = [];
  if (this.hasCloudProvider('aws')) providers.push('aws');
  if (this.hasCloudProvider('gcp')) providers.push('gcp');
  if (this.hasCloudProvider('azure')) providers.push('azure');
  return providers;
};

// Check subscription limits
userSchema.methods.canDeploy = function() {
  const limits = {
    free: 5,
    pro: 50,
    enterprise: -1 // unlimited
  };
  
  const limit = limits[this.subscription.plan];
  return limit === -1 || this.usage.deploymentsThisMonth < limit;
};

userSchema.methods.canMakeAIRequest = function() {
  const limits = {
    free: 100,
    pro: 1000,
    enterprise: -1 // unlimited
  };
  
  const limit = limits[this.subscription.plan];
  return limit === -1 || this.usage.aiRequestsThisMonth < limit;
};

// Reset usage at the beginning of each month
userSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.deploymentsThisMonth = 0;
    this.usage.aiRequestsThisMonth = 0;
    this.usage.lastResetDate = now;
    return true;
  }
  
  return false;
};

module.exports = mongoose.model('User', userSchema);
