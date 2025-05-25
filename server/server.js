import express from 'express';
import programRoutes from './routes/programRoutes';
const app = express();
app.use(express.json()); // Automatically parse JSON in request body
app.use('/api/programs', programRoutes); // Mount routes
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
//# sourceMappingURL=server.js.map