jest.mock('../services/UserService', () => {
    return require('./mocks/userService');
});

import { ContributorType } from "@cr_docs_t/dts";
import { DocumentModel } from "../models/Document.schema";
import { DocumentServices } from "../services/DocumentServices";
import { Document } from "../types/types";
import { OWNER_EMAIL } from "./mocks/userService";
import { describe } from "node:test";

const documentWithNoOwner: Document = {
    name: "anonymous",
    serializedCRDTState: "",
    contributors: []
}

const documentWithAnOwner: Document = {
    name: 'non-anonymous',
    serializedCRDTState: "",
    contributors: [],
    ownerId: "user_1"
};

describe("Unit testing the document service functions", () => {
    it('tests create document', async () => {
        const document = await DocumentServices.createDocument(null);

        expect(document._id).toBeDefined();
        expect(document.name).toEqual("New Document");
        expect(document.ownerId).toBeNull();
        expect(document.contributors).toEqual([]);
    });

    it('tests that IsDocumentOwnerOrCollaborator returns true and editor for anonymous document', async () => {
        //given 
        const document = await DocumentModel.create(documentWithNoOwner);
        const randomEmail = "random@random.com";

        //when
        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), randomEmail);

        //then
        expect(canAccessDocument).toEqual(true);
        expect(accessType).toEqual(ContributorType.EDITOR);

    });

    it('tests that IsDocumentOwnerOrCollaborator returns true and editor if an anonymous user tries to access an anonymous document',
        async () => {

            //given
            const document = await DocumentModel.create(documentWithNoOwner);
            //when

            const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString());
            //then
            expect(canAccessDocument).toEqual(true);
            expect(accessType).toEqual(ContributorType.EDITOR);
        });

    it('tests that a non anonymous document cannot be accessed by an anonymous user', async () => {
        //given
        const document = await DocumentModel.create(documentWithAnOwner);

        //when
        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString());

        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();
    });

    it('tests that a non-anonymous document can be accessed by the documents owner', async () => {
        //given
        const document = await DocumentModel.create(documentWithAnOwner);

        //when 
        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), OWNER_EMAIL);

        //then
        expect(canAccessDocument).toEqual(true);
        expect(accessType).toEqual(ContributorType.EDITOR);
    });

    it('tests that a non collaborator cannot access the a non-anonymous document', async () => {
        //given
        const document = await DocumentModel.create(documentWithAnOwner);

        //when 
        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), "okay@okay.com");

        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();
    });

    it('tests that a contributor does not have access once you have removed them', async () => {
        //given
        const newDocument = structuredClone(documentWithAnOwner);
        newDocument.contributors.push({
            email: "randomEmail1@gmail.com",
            contributorType: ContributorType.EDITOR
        });

        //when
        const dbDocument = await DocumentModel.create(newDocument);
        await DocumentServices.removeContributor(dbDocument._id.toString(), "randomEmail1@gmail.com");

        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(dbDocument._id.toString(), "randomEmail1@gmail.com");

        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();

        const newDbDocument = await DocumentModel.findById(dbDocument._id);
        expect(newDbDocument!.contributors).toHaveLength(0);
        expect(newDbDocument!.contributors).toEqual([]);

    });

    it('throws error when you try to remove the owner of the document', async () => {
        const document = await DocumentModel.create(documentWithAnOwner);

        expect(async () => await DocumentServices.removeContributor(document._id.toString(), "random@random.com")).rejects.toThrow("Document does not exist, user is owner or user was never a contributor")
    });

    it('throws an error when you try to change the change the contributor type of the owner', async () => {
        const document = await DocumentModel.create(documentWithAnOwner);

        expect(async () => await DocumentServices.changeContributorType(document._id.toString(), "random@random.com", ContributorType.VIEWER)).rejects.toThrow("user is owner or was never a contributor")
    });



    describe('parametrised test to check that a document can be accessed by a contributor', () => {
        it.each([
            { email: "tani@gmail.com", contributionType: ContributorType.EDITOR },
            { email: "madiba@gmail.com", contributionType: ContributorType.VIEWER }
        ])
            ('tests that a non-anonymous document can be accessed by a contributor', async ({ email, contributionType }) => {
                //given
                const newDocument = structuredClone(documentWithAnOwner);
                newDocument.contributors.push({
                    email,
                    contributorType: contributionType
                });
                const dbDocument = await DocumentModel.create(newDocument);

                //when 
                const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(dbDocument._id.toString(), email);

                //then
                expect(canAccessDocument).toEqual(true);
                expect(accessType).toEqual(contributionType);

            });
    });

    describe('parametrised test to check that a contributor type can be changed and that user can still access the document', () => {
        it.each([
            { email: "tani@gmail.com", contributorType: ContributorType.EDITOR },
            { email: "madiba@gmail.com", contributorType: ContributorType.VIEWER }
        ])
            ("test that user's contributor type can be changed but they can still access the document", async ({ email, contributorType }) => {
                const newDocument = structuredClone(documentWithAnOwner);
                newDocument.contributors.push({
                    email, contributorType
                });

                const dbDocument = await DocumentModel.create(newDocument);

                await DocumentServices.changeContributorType(dbDocument._id.toString(), email,
                    (contributorType === ContributorType.EDITOR) ? ContributorType.VIEWER : ContributorType.EDITOR
                );

                const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(dbDocument._id.toString(), email);

                expect(canAccessDocument).toEqual(true);
                expect(accessType).toEqual((contributorType === ContributorType.EDITOR) ? ContributorType.VIEWER : ContributorType.EDITOR);
            });
    });


});