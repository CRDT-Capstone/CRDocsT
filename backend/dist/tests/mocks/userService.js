"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = exports.OWNER_EMAIL = void 0;
exports.OWNER_EMAIL = "random@random.com";
const getUserByEmail = jest.fn().mockImplementation((email) => {
    if (email === "random@random.com")
        return { id: "user_1", email: "random@random.com" };
    return { id: "user_x", email };
});
const getUserEmailById = jest.fn().mockResolvedValue("example@gmail.com");
exports.UserService = {
    getUserByEmail,
    getUserEmailById
};
