export const OWNER_EMAIL = "random@random.com"

const getUserByEmail = jest.fn().mockImplementation((email:string)=>{
    if(email === "random@random.com") return {id: "user_1", email: "random@random.com"}
    return {id: "user_x", email};
});

const getUserEmailById = jest.fn().mockImplementation((userId: string)=>{
    if(userId === "user_1") return OWNER_EMAIL;
    return "example@gmail.com"
});

export const UserService = {
    getUserByEmail, 
    getUserEmailById
}