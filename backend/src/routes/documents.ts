import { Router } from 'express';
import { DocumentController } from '../controllers/documents';
import { OnlyCollaboratorsAndOwners } from '../middlewares/documentMiddlewares';

export const DocumentRouter = Router();

DocumentRouter.post('/create', DocumentController.createDocument);
DocumentRouter.put('/update/:documentID', DocumentController.updateDocumentName);
//TODO: make this a general update endpoint
DocumentRouter.get('/user', DocumentController.getDocumentsByUserId);
DocumentRouter.get('/:documentId', DocumentController.getDocumentById);
DocumentRouter.post('/share', DocumentController.shareDocumentViaEmail);