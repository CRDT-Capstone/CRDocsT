import { createClerkClient } from "@clerk/backend";
import crypto from "crypto";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const getUserEmailById = async (userId: string) => {
    const user = await clerkClient.users.getUser(userId);
    return user.emailAddresses[0].emailAddress;
}

const getUserByEmail = async (email: string) => {
    const user = await clerkClient.users.getUserList({
        emailAddress: [email]
    });

    if (user.data.length === 0) return undefined;

    return user.data[0];
}

const getIdentifierForAnonymousUser = () => {
    const randomString = crypto.randomBytes(10).toString("hex");
    return `AnonymousUser-${randomString}`;
}

export const UserService = {
    getUserEmailById,
    getUserByEmail,
    getIdentifierForAnonymousUser
};