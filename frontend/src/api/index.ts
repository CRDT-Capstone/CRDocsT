export const ApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export type TokenFunc = () => Promise<string | null>;

export const includeToken = (token: string | null) => {
    return { Authorization: `Bearer ${token}` };
};
