// Import routes
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const workOrderRoutes = require('./routes/workOrderRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const workerScheduleRoutes = require('./routes/workerScheduleRoutes');
const searchRoutes = require('./routes/searchRoutes');

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/buildings', buildingRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/reminders', reminderRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/schedule', scheduleRoutes);
app.use('/api/v1/worker-schedules', workerScheduleRoutes);
app.use('/api/v1/search', searchRoutes);
