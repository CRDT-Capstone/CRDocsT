"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareDocumentEmailTemplate = void 0;
const dts_1 = require("@cr_docs_t/dts");
const host = process.env.FRONTEND_HOST;
const shareDocumentEmailTemplate = (contributionType, documentId) => {
    return `
    <h1>Hello!</h1>
    <p>You have been invited to ${contributionType === dts_1.ContributorType.VIEWER ? 'view' : 'edit'} this Bragi document. </p>
    <p> Click <a href="${host}/docs/${documentId}"> here </a> to access the document </p>`;
};
exports.shareDocumentEmailTemplate = shareDocumentEmailTemplate;
