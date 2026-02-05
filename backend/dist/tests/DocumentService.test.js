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
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../services/UserService', () => {
    return require('./mocks/userService');
});
const dts_1 = require("@cr_docs_t/dts");
const Document_schema_1 = require("../models/Document.schema");
const DocumentServices_1 = require("../services/DocumentServices");
const userService_1 = require("./mocks/userService");
const node_test_1 = require("node:test");
const documentWithNoOwner = {
    name: "anonymous",
    serializedCRDTState: "",
    contributors: []
};
const documentWithAnOwner = {
    name: 'non-anonymous',
    serializedCRDTState: "",
    contributors: [],
    ownerId: "user_1"
};
(0, node_test_1.describe)("Unit testing the document service functions", () => {
    it('tests create document', () => __awaiter(void 0, void 0, void 0, function* () {
        const document = yield DocumentServices_1.DocumentServices.createDocument(null);
        expect(document._id).toBeDefined();
        expect(document.name).toEqual("New Document");
        expect(document.ownerId).toBeNull();
        expect(document.contributors).toEqual([]);
    }));
    it('tests that IsDocumentOwnerOrCollaborator returns true and editor for anonymous document', () => __awaiter(void 0, void 0, void 0, function* () {
        //given 
        const document = yield Document_schema_1.DocumentModel.create(documentWithNoOwner);
        const randomEmail = "random@random.com";
        //when
        const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), randomEmail);
        //then
        expect(canAccessDocument).toEqual(true);
        expect(accessType).toEqual(dts_1.ContributorType.EDITOR);
    }));
    it('tests that IsDocumentOwnerOrCollaborator returns true and editor if an anonymous user tries to access an anonymous document', () => __awaiter(void 0, void 0, void 0, function* () {
        //given
        const document = yield Document_schema_1.DocumentModel.create(documentWithNoOwner);
        //when
        const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString());
        //then
        expect(canAccessDocument).toEqual(true);
        expect(accessType).toEqual(dts_1.ContributorType.EDITOR);
    }));
    it('tests that a non anonymous document cannot be accessed by an anonymous user', () => __awaiter(void 0, void 0, void 0, function* () {
        //given
        const document = yield Document_schema_1.DocumentModel.create(documentWithAnOwner);
        //when
        const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString());
        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();
    }));
    it('tests that a non-anonymous document can be accessed by the documents owner', () => __awaiter(void 0, void 0, void 0, function* () {
        //given
        const document = yield Document_schema_1.DocumentModel.create(documentWithAnOwner);
        //when 
        const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), userService_1.OWNER_EMAIL);
        //then
        expect(canAccessDocument).toEqual(true);
        expect(accessType).toEqual(dts_1.ContributorType.EDITOR);
    }));
    it('tests that a non collaborator cannot access the a non-anonymous document', () => __awaiter(void 0, void 0, void 0, function* () {
        //given
        const document = yield Document_schema_1.DocumentModel.create(documentWithAnOwner);
        //when 
        const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), "okay@okay.com");
        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();
    }));
    it('tests that a contributor does not have access once you have removed them', () => __awaiter(void 0, void 0, void 0, function* () {
        //given
        const newDocument = structuredClone(documentWithAnOwner);
        newDocument.contributors.push({
            email: "randomEmail1@gmail.com",
            contributorType: dts_1.ContributorType.EDITOR
        });
        //when
        const dbDocument = yield Document_schema_1.DocumentModel.create(newDocument);
        yield DocumentServices_1.DocumentServices.removeContributor(dbDocument._id.toString(), "randomEmail1@gmail.com");
        const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(dbDocument._id.toString(), "randomEmail1@gmail.com");
        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();
        const newDbDocument = yield Document_schema_1.DocumentModel.findById(dbDocument._id);
        expect(newDbDocument.contributors).toHaveLength(0);
        expect(newDbDocument.contributors).toEqual([]);
    }));
    it('throws error when you try to remove the owner of the document', () => __awaiter(void 0, void 0, void 0, function* () {
        const document = yield Document_schema_1.DocumentModel.create(documentWithAnOwner);
        expect(() => __awaiter(void 0, void 0, void 0, function* () { return yield DocumentServices_1.DocumentServices.removeContributor(document._id.toString(), "random@random.com"); })).rejects.toThrow("Document does not exist, user is owner or user was never a contributor");
    }));
    it('throws an error when you try to change the change the contributor type of the owner', () => __awaiter(void 0, void 0, void 0, function* () {
        const document = yield Document_schema_1.DocumentModel.create(documentWithAnOwner);
        expect(() => __awaiter(void 0, void 0, void 0, function* () { return yield DocumentServices_1.DocumentServices.changeContributorType(document._id.toString(), "random@random.com", dts_1.ContributorType.VIEWER); })).rejects.toThrow("user is owner or was never a contributor");
    }));
    (0, node_test_1.describe)('parametrised test to check that a document can be accessed by a contributor', () => {
        it.each([
            { email: "tani@gmail.com", contributionType: dts_1.ContributorType.EDITOR },
            { email: "madiba@gmail.com", contributionType: dts_1.ContributorType.VIEWER }
        ])('tests that a non-anonymous document can be accessed by a contributor', (_a) => __awaiter(void 0, [_a], void 0, function* ({ email, contributionType }) {
            //given
            const newDocument = structuredClone(documentWithAnOwner);
            newDocument.contributors.push({
                email,
                contributorType: contributionType
            });
            const dbDocument = yield Document_schema_1.DocumentModel.create(newDocument);
            //when 
            const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(dbDocument._id.toString(), email);
            //then
            expect(canAccessDocument).toEqual(true);
            expect(accessType).toEqual(contributionType);
        }));
    });
    (0, node_test_1.describe)('parametrised test to check that a contributor type can be changed and that user can still access the document', () => {
        it.each([
            { email: "tani@gmail.com", contributorType: dts_1.ContributorType.EDITOR },
            { email: "madiba@gmail.com", contributorType: dts_1.ContributorType.VIEWER }
        ])("test that user's contributor type can be changed but they can still access the document", (_a) => __awaiter(void 0, [_a], void 0, function* ({ email, contributorType }) {
            const newDocument = structuredClone(documentWithAnOwner);
            newDocument.contributors.push({
                email, contributorType
            });
            const dbDocument = yield Document_schema_1.DocumentModel.create(newDocument);
            yield DocumentServices_1.DocumentServices.changeContributorType(dbDocument._id.toString(), email, (contributorType === dts_1.ContributorType.EDITOR) ? dts_1.ContributorType.VIEWER : dts_1.ContributorType.EDITOR);
            const [canAccessDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(dbDocument._id.toString(), email);
            expect(canAccessDocument).toEqual(true);
            expect(accessType).toEqual((contributorType === dts_1.ContributorType.EDITOR) ? dts_1.ContributorType.VIEWER : dts_1.ContributorType.EDITOR);
        }));
    });
});
