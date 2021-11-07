import {NominatedStake, StakingReward, StakingSlash} from '../types/models';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import {Balance} from '@polkadot/types/interfaces';
const md5 = require('md5');

async function getValidatorFromRewardEvent(event: SubstrateEvent) {
    if(event.extrinsic.extrinsic.method.method.toString() === 'payoutStakers') {
        const [validator, era] = event.extrinsic.extrinsic.args;
        return [validator.toString(), false];
    }

    const {event: {data: [account, newReward]}} = event;
    const [calls] = event.extrinsic.extrinsic.args;
    let era = await getBlockEra(event.block);

    let validators = [];

    // @ts-ignore
    calls.map(function(call) {
        if(call.method.toString() === 'payoutStakers') {
            let [validator, callEra] = call.args;
            validators.push(validator.toString());
        }
    });

    if(validators.length === 0) {
        return [null, false];
    } else if(validators.length === 1) {
        return [validators[0], false];
    }

    let search = validators.indexOf(account.toString());

    if(search !== -1) {
        return [account.toString(), false];
    }

    let stakes = [];
    let stakeValidators = [];

    for (let validator of validators) {
        let nominatedStake = await getNominatedStake(account.toString(), validator.toString(), era);
        if(nominatedStake !== undefined) {
            stakes.push(nominatedStake);
            stakeValidators.push(nominatedStake.validator);
        }
    }

    if(stakes.length === 0) {
        return [validators.join(':'), true];
    } else if(stakes.length === 1) {
        return [stakes[0].validator, false];
    }

    let accountRewardEvents = [];

    event.extrinsic.events.map(function (item, index) {
        if(['Reward', 'Rewarded'].indexOf(item.event.method.toString()) === -1) {
            return;
        }

        const {event: {data: [itemAccount, itemNewReward]}} = item
        if(itemAccount == account) {
            accountRewardEvents.push({
                account: itemAccount.toString(),
                reward: (itemNewReward as Balance).toBigInt()
            })
        }
    });

    if(accountRewardEvents.length === 1) {
        return [stakeValidators.join(':'), true];
    }

    // more than 1 rewards and more than 1 validators
    // rewards count = stakes count
    stakeValidators.sort(function(a, b) {
        return a.nominated - b.nominated;
    });

    accountRewardEvents.sort(function(a, b) {
        return a.reward - b.reward;
    });

    let currentReward = (newReward as Balance).toBigInt();

    let rewardIndex = accountRewardEvents.findIndex(function (rewardObj, index) {
        return rewardObj.reward === currentReward;
    });

    return [stakeValidators[rewardIndex], false];
}

async function getNominatedStake(accountId, validator, era) {
    const id = md5(accountId + validator + era);
    return await NominatedStake.get(id);
}

async function loadNominatedStakes(block: SubstrateBlock, validator: string, era) {
    era = parseInt(era);

    // let nominators = await api.query.staking.erasStakers.at(block.block.hash.toString(), era, validator);
    let nominators = await api.query.staking.erasStakers(era, validator);

    // @ts-ignore
    for(let nominator of nominators.others) {
        let accountId = nominator.who;
        let id = md5(accountId.toString() + validator + era);
        let nominatedStake = await NominatedStake.get(id);

        if(nominatedStake === undefined) {
            nominatedStake = new NominatedStake(id);
            nominatedStake.account = accountId.toString();
            nominatedStake.validator = validator.toString();
            nominatedStake.era = era;
            nominatedStake.nominated = nominator.value.toBigInt();
            await nominatedStake.save();
        }
    }
}

export async function handlePayoutStakers(extrinsic: SubstrateExtrinsic): Promise<void> {
    let [validator, era] = extrinsic.extrinsic.args;
    era = await getBlockEra(extrinsic.block);
    await loadNominatedStakes(extrinsic.block, validator.toString(), era);
}

export async function handleStakingRewarded(event: SubstrateEvent): Promise<void> {
    await handleStakingReward(event)
}

export async function handleStakingReward(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, newReward]}} = event;
    const entity = new StakingReward(`${event.block.block.header.number}-${event.idx.toString()}`);

    entity.accountId = account.toString();
    entity.balance = (newReward as Balance).toBigInt();
    entity.date = event.block.timestamp;
    entity.era = await getBlockEra(event.block);

    const [validator, multiple] = await getValidatorFromRewardEvent(event);

    entity.validator = validator;
    entity.multiple = multiple;

    await entity.save();
}

export async function handleStakingSlashed(event: SubstrateEvent): Promise<void> {
    await handleStakingSlash(event)
}

export async function handleStakingSlash(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, newSlash]}} = event;
    const entity = new StakingSlash(`${event.block.block.header.number}-${event.idx.toString()}`);
    entity.accountId = account.toString();
    entity.balance = (newSlash as Balance).toBigInt();
    entity.date = event.block.timestamp;
    await entity.save();
}

const getBlockEra = (function () {
    let lastBlock = undefined;
    let lastEra = undefined;

    return async function (block: SubstrateBlock) {
        let blockNumber = block.block.header.number.toNumber();

        if(blockNumber != lastBlock) {
            let era = await api.query.staking.activeEra();
            //@ts-ignore
            era = era.toHuman().index;
            lastEra = era;
            lastBlock = blockNumber;
        }

        return lastEra;
    }
})();
