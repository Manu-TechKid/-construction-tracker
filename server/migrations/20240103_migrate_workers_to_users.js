const mongoose = require('mongoose');
const User = require('../models/User');
const Worker = require('../models/Worker');
const WorkOrder = require('../models/WorkOrder');

/**
 * Migration to consolidate Worker model into User model
 * This fixes the dual worker system that causes assignment inconsistencies
 */
async function migrateWorkersToUsers() {
    console.log('Starting worker migration...');
    
    try {
        // Get all existing workers
        const workers = await Worker.find({});
        console.log(`Found ${workers.length} workers to migrate`);
        
        const migrationResults = {
            migrated: 0,
            duplicates: 0,
            errors: 0
        };
        
        for (const worker of workers) {
            try {
                // Check if user already exists with this email
                const existingUser = await User.findOne({ email: worker.email });
                
                if (existingUser) {
                    // User exists - update their worker profile
                    if (existingUser.role === 'worker') {
                        existingUser.workerProfile = {
                            skills: worker.skills || [],
                            paymentType: worker.paymentType || 'hourly',
                            hourlyRate: worker.hourlyRate,
                            contractRate: worker.contractRate,
                            status: worker.status || 'active',
                            notes: worker.notes,
                            approvalStatus: 'approved', // Existing workers are pre-approved
                            createdBy: null // Employer-created
                        };
                        await existingUser.save();
                        
                        // Update work order assignments
                        await WorkOrder.updateMany(
                            { 'assignedTo.worker': worker._id },
                            { $set: { 'assignedTo.$.worker': existingUser._id } }
                        );
                        
                        console.log(`Updated existing user: ${worker.email}`);
                        migrationResults.duplicates++;
                    }
                } else {
                    // Create new user from worker
                    const newUser = new User({
                        name: worker.name,
                        email: worker.email,
                        phone: worker.phone,
                        role: 'worker',
                        password: 'TempPassword123!', // Temporary password - user must reset
                        isActive: worker.status === 'active',
                        workerProfile: {
                            skills: worker.skills || [],
                            paymentType: worker.paymentType || 'hourly',
                            hourlyRate: worker.hourlyRate,
                            contractRate: worker.contractRate,
                            status: worker.status || 'active',
                            notes: worker.notes,
                            approvalStatus: 'approved', // Existing workers are pre-approved
                            createdBy: null // Employer-created
                        }
                    });
                    
                    await newUser.save();
                    
                    // Update work order assignments
                    await WorkOrder.updateMany(
                        { 'assignedTo.worker': worker._id },
                        { $set: { 'assignedTo.$.worker': newUser._id } }
                    );
                    
                    console.log(`Created new user: ${worker.email}`);
                    migrationResults.migrated++;
                }
                
                // Delete the old worker record
                await Worker.findByIdAndDelete(worker._id);
                
            } catch (error) {
                console.error(`Error migrating worker ${worker.email}:`, error);
                migrationResults.errors++;
            }
        }
        
        console.log('Migration completed:', migrationResults);
        
        // Verify migration
        const remainingWorkers = await Worker.countDocuments();
        const totalUsers = await User.countDocuments({ role: 'worker' });
        
        console.log(`Verification: ${remainingWorkers} workers remaining, ${totalUsers} worker users`);
        
        return migrationResults;
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

/**
 * Rollback function (use with caution)
 */
async function rollbackMigration() {
    console.log('Rolling back migration...');
    
    try {
        // Find all users with worker profiles that were migrated
        const workerUsers = await User.find({ 
            role: 'worker',
            'workerProfile.createdBy': null // These were migrated from Worker model
        });
        
        for (const user of workerUsers) {
            // Recreate Worker record
            const worker = new Worker({
                name: user.name,
                email: user.email,
                phone: user.phone,
                skills: user.workerProfile.skills,
                paymentType: user.workerProfile.paymentType,
                hourlyRate: user.workerProfile.hourlyRate,
                contractRate: user.workerProfile.contractRate,
                status: user.workerProfile.status,
                notes: user.workerProfile.notes
            });
            
            await worker.save();
            
            // Update work order assignments back to worker
            await WorkOrder.updateMany(
                { 'assignedTo.worker': user._id },
                { $set: { 'assignedTo.$.worker': worker._id } }
            );
            
            // Remove user
            await User.findByIdAndDelete(user._id);
        }
        
        console.log('Rollback completed');
        
    } catch (error) {
        console.error('Rollback failed:', error);
        throw error;
    }
}

module.exports = {
    migrateWorkersToUsers,
    rollbackMigration
};
