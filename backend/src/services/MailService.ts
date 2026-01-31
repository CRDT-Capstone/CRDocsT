import sgMail from "@sendgrid/mail";
import { DocumentServices } from "./DocumentServices";
import { ContributorType } from "@cr_docs_t/dts";
import { shareDocumentEmailTemplate } from "../templates/shareDocumentTemplete";

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

export const MailService = {
    sendShareDocumentEmail,
};

