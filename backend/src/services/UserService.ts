import { createClerkClient } from "@clerk/backend";
import { logger } from "../logging";
import crypto from "crypto";

const getUserEmailById = async (userId: string) => {
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const user = await clerkClient.users.getUser(userId);
    return user.emailAddresses[0].emailAddress;
};

const getUserByEmail = async (email: string) => {
    try {
        const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
        const user = await clerkClient.users.getUserList({
            emailAddress: [email],
        });

        if (user.data.length === 0) return undefined;

        return user.data[0];
    } catch (err) {
        logger.error("Can't get user by email", { err });
        return undefined;
        // throw err;
    }
};

const getIdentifierForAnonymousUser = () => {
    const randomString = crypto.randomBytes(10).toString("hex");
    return `AnonymousUser-${randomString}`;
}

export const UserService = {
    getUserEmailById,
    getUserByEmail,
