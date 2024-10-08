import express from 'express';
import copyrightController from '../controllers/copyrightController';

const router = express.Router();

// Route to search for copyrights
router.get('/search', copyrightController.search.bind(copyrightController));

export default router;