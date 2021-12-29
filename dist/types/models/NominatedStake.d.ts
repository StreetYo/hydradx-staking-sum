import { Entity, FunctionPropertyNames } from "@subql/types";
export declare class NominatedStake implements Entity {
    constructor(id: string);
    id: string;
    account: string;
    validator?: string;
    era?: number;
    nominated?: bigint;
    save(): Promise<void>;
    static remove(id: string): Promise<void>;
    static get(id: string): Promise<NominatedStake | undefined>;
    static create(record: Partial<Omit<NominatedStake, FunctionPropertyNames<NominatedStake>>> & Entity): NominatedStake;
}
