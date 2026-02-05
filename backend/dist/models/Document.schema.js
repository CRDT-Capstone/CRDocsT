"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = void 0;
const mongoose_1 = require("mongoose");
const dts_1 = require("@cr_docs_t/dts");
const ContributorSchema = new mongoose_1.Schema({
    contributorType: {
        required: true,
        type: String,
        enum: dts_1.ContributorType,
    },
    email: {
        type: String,
        required: false,
    },
});
const DocumentSchema = new mongoose_1.Schema({
    name: {
        type: String,
        default: "New Document",
        required: true,
    },
    serializedCRDTState: {
        type: String,
        required: false,
    },
    ownerId: {
        type: String,
        required: false,
    },
    contributors: {
        type: [ContributorSchema],
        default: [],
    },
}, {
    timestamps: true,
});
DocumentSchema.index({ _id: 1, "contributors.email": 1 }, { unique: true });
exports.DocumentModel = (0, mongoose_1.model)("document", DocumentSchema);
