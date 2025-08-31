const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'supervisor', 'worker'],
        default: 'worker'
    },
    phone: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    // Worker-specific fields (only used when role === 'worker')
    workerProfile: {
        skills: [{
            type: String,
            enum: ['painting', 'carpentry', 'plumbing', 'electrical', 'cleaning', 'general_labor', 'hvac', 'flooring', 'roofing']
        }],
        paymentType: {
            type: String,
            enum: ['hourly', 'contract'],
            default: 'hourly'
        },
        hourlyRate: {
            type: Number,
            min: 0
        },
        contractRate: {
            type: Number,
            min: 0
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'on_leave'],
            default: 'active'
        },
        notes: String,
        // Track if this worker was created by an employer vs self-registered
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        // Employer approval status for self-registered workers
        approvalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: function() {
                // Auto-approve if created by employer, pending if self-registered
                return this.createdBy ? 'approved' : 'pending';
            }
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date
    }
}, {
    timestamps: true
});

// Index for worker queries
userSchema.index({ role: 1, 'workerProfile.status': 1 });
userSchema.index({ 'workerProfile.skills': 1 });
userSchema.index({ 'workerProfile.approvalStatus': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Update passwordChangedAt if password modified
userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000; // ensure token issued after this
    next();
});

// Initialize worker profile for workers
userSchema.pre('save', function(next) {
    if (this.role === 'worker' && !this.workerProfile) {
        this.workerProfile = {
            skills: [],
            paymentType: 'hourly',
            status: 'active',
            approvalStatus: this.createdBy ? 'approved' : 'pending'
        };
    }
    next();
});

// Method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    return resetToken;
};

// Virtual for checking if user is an approved worker
userSchema.virtual('isApprovedWorker').get(function() {
    return this.role === 'worker' && this.workerProfile?.approvalStatus === 'approved';
});

// Static method to get available workers
userSchema.statics.getAvailableWorkers = function() {
    return this.find({
        role: 'worker',
        isActive: true,
        'workerProfile.status': 'active',
        'workerProfile.approvalStatus': 'approved'
    }).select('name email phone workerProfile');
};

module.exports = mongoose.model('User', userSchema);
