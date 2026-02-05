"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const DocumentServices_1 = require("./DocumentServices");
const shareDocumentTemplete_1 = require("../templates/shareDocumentTemplete");
mail_1.default.setApiKey(process.env.SEND_GRID_API_KEY);
const sendShareDocumentEmail = (receiverEmail, documentId, contributionType) => __awaiter(void 0, void 0, void 0, function* () {
    const metadata = yield DocumentServices_1.DocumentServices.getDocumentMetadataById(documentId);
    const msg = {
        to: receiverEmail,
        from: "stuffmy315@gmail.com",
        subject: `Invited to ${metadata.name}`,
        html: (0, shareDocumentTemplete_1.shareDocumentEmailTemplate)(contributionType, documentId),
    };
    return yield mail_1.default.send(msg);
});
exports.MailService = {
    sendShareDocumentEmail,
};
