import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => {
    res.json({ message: 'Programs endpoint working!' });
});
export default router;
//# sourceMappingURL=programRoutes.js.map