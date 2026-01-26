const getUserByEmail = jest.fn().mockResolvedValue({
    id: 'user_1'
});

const getUserEmailById = jest.fn().mockResolvedValue(
    "example@gmail.com"
);

export const UserService = {
    getUserByEmail, 
    getUserEmailById
}