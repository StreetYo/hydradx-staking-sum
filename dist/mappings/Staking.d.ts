import { SubstrateEvent, SubstrateExtrinsic } from "@subql/types";
export declare function handleStakingSlashed(event: SubstrateEvent): Promise<void>;
export declare function handleStakingSlash(event: SubstrateEvent): Promise<void>;
export declare function handlePayoutStakers(extrinsic: SubstrateExtrinsic): Promise<void>;
export declare function handlePayoutStakersBatch(extrinsic: SubstrateExtrinsic): Promise<void>;
