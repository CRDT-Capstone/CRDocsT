import { Router } from 'express';
import { DocumentController } from '../controllers/documents';

export const DocumentRouter = Router();

DocumentRouter.post('/create', DocumentController.createDocument);