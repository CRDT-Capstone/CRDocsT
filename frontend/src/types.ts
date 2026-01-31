import { ContributorType } from "@cr_docs_t/dts";

export type Position = string;

export type Contributor = {
    contributorType: ContributorType;
    email: string;
};

export interface Document {
    _id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    ownerId: string | null;
    contributors: Contributor[];
}
//TODO: move to the types library
