import { Router } from 'express';
import { DocumentController } from '../controllers/documents';

export const DocumentRouter = Router();

DocumentRouter.post('/create', DocumentController.createDocument);
DocumentRouter.put('/update/:documentID', DocumentController.updateDocumentName);
//TODO: make this a general update endpoint
DocumentRouter.get('/:userId', DocumentController.getDocumentsByUserId);
DocumentRouter.get(':/documentId', DocumentController.getDocumentById);