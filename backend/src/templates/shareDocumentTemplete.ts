import { ContributorType } from "@cr_docs_t/dts";

const host = process.env.FRONTEND_HOST;

export const shareDocumentEmailTemplate = (contributionType: ContributorType, documentId: string) => {
    return `
    <h1>Hello!</h1>
    <p>You have been invited to ${contributionType === ContributorType.VIEWER ? "view" : "edit"} this Bragi document. </p>
    <p> Click <a href="${host}/docs/${documentId}"> here </a> to access the document </p>`;
};

export const shareProjectEmailTemplate = (contributionType: ContributorType, projectId: string) => {
    return `
    <h1>Hello!</h1>
    <p>You have been invited to ${contributionType === ContributorType.VIEWER ? "view" : "edit"} this Bragi project. </p>
    <p> Click <a href="${host}/projects/${projectId}"> here </a> to access the project </p>`;
};

