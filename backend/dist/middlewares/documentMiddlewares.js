"use strict";
/*
Need to implement things to help with permissions
View Only
Can Edit

Not even sure this is where it should be, but yeah
- Tani
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlyDocumentOwner = exports.OnlyCollaboratorsAndOwners = void 0;
const DocumentServices_1 = require("../services/DocumentServices");
const express_1 = require("@clerk/express");
const ApiResponseUtils_1 = require("../utils/ApiResponseUtils");
const OnlyCollaboratorsAndOwners = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { documentId } = req.params;
    let { email } = req.body; //has to be in there to allow for 'anonymous' users
    if (!email) {
        (0, ApiResponseUtils_1.sendUnathorizedResponse)(res, "Email is required");
        return;
    }
    const isAllowed = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(documentId, email);
    if (isAllowed)
        next();
    else
        (0, ApiResponseUtils_1.sendUnathorizedResponse)(res);
});
exports.OnlyCollaboratorsAndOwners = OnlyCollaboratorsAndOwners;
const OnlyDocumentOwner = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { documentId } = req.body || req.params;
    if (!documentId)
        (0, ApiResponseUtils_1.sendUnathorizedResponse)(res);
    const { userId } = (0, express_1.getAuth)(req);
    const isAllowed = yield DocumentServices_1.DocumentServices.isDocumentOwner(documentId, (userId === null || userId === void 0 ? void 0 : userId.toString()) || "");
    if (isAllowed)
        next();
    else
        (0, ApiResponseUtils_1.sendUnathorizedResponse)(res);
});
exports.OnlyDocumentOwner = OnlyDocumentOwner;
