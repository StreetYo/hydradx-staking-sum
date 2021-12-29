import { Entity, FunctionPropertyNames } from "@subql/types";
export declare class NoBondRecordAccount implements Entity {
    constructor(id: string);
    id: string;
    firstRewardAt: number;
    save(): Promise<void>;
    static remove(id: string): Promise<void>;
    static get(id: string): Promise<NoBondRecordAccount | undefined>;
    static create(record: Partial<Omit<NoBondRecordAccount, FunctionPropertyNames<NoBondRecordAccount>>> & Entity): NoBondRecordAccount;
}
