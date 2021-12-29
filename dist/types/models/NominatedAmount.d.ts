import { Entity, FunctionPropertyNames } from "@subql/types";
export declare class NominatedAmount implements Entity {
    constructor(id: string);
    id: string;
    account: string;
    era?: number;
    amount?: bigint;
    save(): Promise<void>;
    static remove(id: string): Promise<void>;
    static get(id: string): Promise<NominatedAmount | undefined>;
    static create(record: Partial<Omit<NominatedAmount, FunctionPropertyNames<NominatedAmount>>> & Entity): NominatedAmount;
}
