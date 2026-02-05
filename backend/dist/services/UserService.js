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
exports.UserService = void 0;
const backend_1 = require("@clerk/backend");
const logging_1 = require("../logging");
const getUserEmailById = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const clerkClient = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = yield clerkClient.users.getUser(userId);
    return user.emailAddresses[0].emailAddress;
});
const getUserByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clerkClient = (0, backend_1.createClerkClient)({ secretKey: process.env.CLERK_SECRET_KEY });
        const user = yield clerkClient.users.getUserList({
            emailAddress: [email],
        });
        if (user.data.length === 0)
            return undefined;
        return user.data[0];
    }
    catch (err) {
        logging_1.logger.error("Can't get user by email", { err });
        return undefined;
        // throw err;
    }
});
exports.UserService = {
    getUserEmailById,
    getUserByEmail,
};
