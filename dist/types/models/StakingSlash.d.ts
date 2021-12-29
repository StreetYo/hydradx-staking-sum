import { Entity, FunctionPropertyNames } from "@subql/types";
export declare class StakingSlash implements Entity {
    constructor(id: string);
    id: string;
    accountId: string;
    balance: bigint;
    date: Date;
    save(): Promise<void>;
    static remove(id: string): Promise<void>;
    static get(id: string): Promise<StakingSlash | undefined>;
    static getByAccountId(accountId: string): Promise<StakingSlash[] | undefined>;
    static create(record: Partial<Omit<StakingSlash, FunctionPropertyNames<StakingSlash>>> & Entity): StakingSlash;
}
