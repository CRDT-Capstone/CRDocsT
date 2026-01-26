export const OWNER_EMAIL = "random@random.com"

const getUserByEmail = jest.fn().mockImplementation((email:string)=>{
    if(email === "random@random.com") return {id: "user_1", email: "random@random.com"}
    return {id: "user_x", email};
});

const getUserEmailById = jest.fn().mockResolvedValue(
    "example@gmail.com"
);

export const UserService = {
    getUserByEmail, 
    getUserEmailById
}