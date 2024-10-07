import express from 'express';
import { createCopyrightHandler, getCopyrightHandler } from '../controllers/copyrightController';


const router = express.Router();


router.post('/copyrights', createCopyrightHandler);
router.get('/copyrights/:id', getCopyrightHandler);
router.get('/copyrights/:id', getCopyrightHandler);

// Add more routes as needed
// Add more routes as needed

export default router;