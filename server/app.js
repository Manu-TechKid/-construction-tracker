const scheduleRoutes = require('./routes/scheduleRoutes');

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/buildings', buildingRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/reminders', reminderRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
