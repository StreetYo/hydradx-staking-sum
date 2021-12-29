import { Entity, FunctionPropertyNames } from "@subql/types";
export declare class SumReward implements Entity {
    constructor(id: string);
    id: string;
    accountReward: bigint;
    accountSlash: bigint;
    accountTotal: bigint;
    save(): Promise<void>;
    static remove(id: string): Promise<void>;
    static get(id: string): Promise<SumReward | undefined>;
    static create(record: Partial<Omit<SumReward, FunctionPropertyNames<SumReward>>> & Entity): SumReward;
}
