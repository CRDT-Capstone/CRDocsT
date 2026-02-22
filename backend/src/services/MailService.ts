import sgMail from "@sendgrid/mail";
import { DocumentServices } from "./DocumentServices";
import { ContributorType } from "@cr_docs_t/dts";
import { shareDocumentEmailTemplate, shareProjectEmailTemplate } from "../templates/shareDocumentTemplete";
import { ProjectServices } from "./ProjectServices";

sgMail.setApiKey(process.env.SEND_GRID_API_KEY!);

const sendShareDocumentEmail = async (receiverEmail: string, documentId: string, contributionType: ContributorType) => {
    const metadata = await DocumentServices.getDocumentMetadataById(documentId);

    const msg = {
        to: receiverEmail,
        from: "stuffmy315@gmail.com",
        subject: `Invited to ${metadata!.name}`,
        html: shareDocumentEmailTemplate(contributionType, documentId),
    };

    return await sgMail.send(msg);
};

const sendShareProjectEmail = async (receiverEmail: string, projectId: string, contributionType: ContributorType) => {
    const meta = await ProjectServices.findProjectById(projectId);

    const msg = {
        to: receiverEmail,
        from: "stuffmy315@gmail.com",
        subject: `Invited to ${meta.project!.name}`,
        html: shareProjectEmailTemplate(contributionType, projectId),
    };

    return await sgMail.send(msg);
};

export const MailService = {
    sendShareDocumentEmail,
    sendShareProjectEmail,
};
