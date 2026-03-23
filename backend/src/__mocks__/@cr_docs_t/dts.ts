export enum ContributorType {
    EDITOR = "EDITOR",
    VIEWER = "VIEWER",
}

export class APIError extends Error {
    constructor(message: string, status?: number) {
        super(message);
        this.name = "APIError";
    }
}
