"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentRouter = void 0;
const express_1 = require("express");
const documents_1 = require("../controllers/documents");
const _1 = require(".");
exports.DocumentRouter = (0, express_1.Router)();
const makeDocumentRoute = (0, _1.makeRouterRoute)(exports.DocumentRouter);
makeDocumentRoute("post", "/create", documents_1.DocumentController.CreateDocument);
//TODO: make this a general update endpoint
makeDocumentRoute("put", "/update/:documentID", documents_1.DocumentController.UpdateDocumentName);
makeDocumentRoute("get", "/user", documents_1.DocumentController.GetDocumentsByUserId);
makeDocumentRoute("get", "/:documentId", documents_1.DocumentController.GetDocumentById);
makeDocumentRoute("post", "/share", documents_1.DocumentController.ShareDocumentViaEmail);
makeDocumentRoute("post", "/:documentId/remove-collaborator", documents_1.DocumentController.RemoveContributor);
makeDocumentRoute("post", "/:documentId/update-collaborator-type", documents_1.DocumentController.UpdateContributorType);
