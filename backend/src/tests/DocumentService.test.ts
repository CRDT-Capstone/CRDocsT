jest.mock('../services/UserService', () => {
    return require('./mocks/userService');
});

import { ContributorType } from "@cr_docs_t/dts";
import { DocumentModel } from "../models/Document.schema";
import { DocumentServices } from "../services/DocumentServices";
import { Document } from "../types/types";

const documentWithNoOwner: Document = {
    name: "anonymous",
    serializedCRDTState: "",
    contributors: []
}

const documntWithAnOwner: Document = {
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

    it('tests that a non anonymous document cannot be accessed by an anonymous user', async ()=>{
        //given
        const document = await DocumentModel.create(documntWithAnOwner);

        //when
        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString());

        //then
        expect(canAccessDocument).toEqual(false);
        expect(accessType).toBeUndefined();
    });

    it('tests that a non-anonymous document can be accessed by the documents owner', async()=>{
        //given
        const document = await DocumentModel.create(documntWithAnOwner);
        
        //when 
        const [canAccessDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(document._id.toString(), "owner@random.com");

        //then
        expect(canAccessDocument).toEqual(true);
        expect(accessType).toEqual(ContributorType.EDITOR);
    })
});