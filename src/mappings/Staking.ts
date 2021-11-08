import {NominatedStake, StakingReward, StakingSlash} from '../types/models';
import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import {Balance} from '@polkadot/types/interfaces';
const md5 = require('md5');

async function getNominatedStake(accountId, validator, era) {
    const id = md5(accountId + validator + era);
    return await NominatedStake.get(id);
}

async function loadNominatedStakes(validator: string, era) {
    era = parseInt(era);

    let nominators = await api.query.staking.erasStakers(era, validator);
    let nomins = [];

    // @ts-ignore
    for(let nominator of nominators.others) {
        await createNominatedStake(
            era,
            nominator.who.toString(),
            validator.toString(),
            nominator.value.toBigInt()
        );

        nomins.push({
            who: nominator.who.toString(),
            value: nominator.value.toBigInt()
        });
    }

    await createNominatedStake(
        era,
        validator.toString(),
        validator.toString(),
        //@ts-ignore
        nominators.own.toBigInt()
    );

    // nomins.sort(function(a, b) {
    //     if (a.value > b.value)
    //         return -1;
    //
    //     if (a.value < b.value)
    //         return 1;
    //
    //     return 0;
    // });

    return nomins;
}

async function createNominatedStake(era, accountId, validator, nominated) {
    let id = md5(accountId + validator + era);
    let nominatedStake = await NominatedStake.get(id);

    if(nominatedStake === undefined) {
        nominatedStake = new NominatedStake(id);
        nominatedStake.account = accountId;
        nominatedStake.validator = validator;
        nominatedStake.era = era;
        nominatedStake.nominated = nominated;
        await nominatedStake.save();
    }
}

export async function handlePayoutStakersBatch(extrinsic: SubstrateExtrinsic): Promise<void> {
    let validators = [];
    let currentEvent = 0;
    let validatorsNominators = [];
    let calls = [];

    if(extrinsic.extrinsic.method.method.toString().toLowerCase() === 'batch') {
        let [extrCalls] = extrinsic.extrinsic.args;
        // @ts-ignore
        calls = extrCalls;
    } else {
        calls.push(extrinsic.extrinsic);
    }

    let rewards = getRewardsFromExtrinsic(extrinsic);

    if(rewards.length === 0) {
        return;
    }

    for (let call of calls) {
        if(call.method.toString() === 'payoutStakers') {
            let [validator, callEra] = call.args;

            validatorsNominators.push(
                await loadNominatedStakes(validator.toString(), callEra.toNumber())
            );

            validators.push({
                validator: validator.toString(),
                era: callEra.toNumber(),
                rewards: []
            });
        }
    }

    if(validators.length === 0) {
        return;
    }

    for(let validatorI in validators) {
        if(rewards[currentEvent].account === validators[validatorI].validator) {
            validators[validatorI].rewards.push(rewards[currentEvent]);
            currentEvent++;
        }

        for(let nominator of validatorsNominators[validatorI]) {
            if(
                currentEvent === rewards.length ||
                rewards[currentEvent].account !== nominator.who
            ) break;

            validators[validatorI].rewards.push(rewards[currentEvent]);
            currentEvent++;
        }
    }

    await saveValidatorsWithRewards(validators);
}

function getRewardsFromExtrinsic(extrinsic: SubstrateExtrinsic) {
    let rewards = [];

    for(let [index, event] of extrinsic.events.entries()) {
        if (event.event.method.toString().toLowerCase() === 'reward') {
            const {event: {data: [account, newReward]}} = event;
            rewards.push({
                account: account.toString(),
                reward: (newReward as Balance).toBigInt(),
                id: `${extrinsic.block.block.header.number.toString()}-${index.toString()}`,
                date: extrinsic.block.timestamp
            })
        }
    }

    return rewards;
}

export async function handlePayoutStakers(extrinsic: SubstrateExtrinsic): Promise<void> {
    let rewards = getRewardsFromExtrinsic(extrinsic);

    if(rewards.length === 0) {
        return;
    }

    let [validator, era] = extrinsic.extrinsic.args;

    await saveValidatorsWithRewards([{
        validator: validator.toString(),
        // @ts-ignore
        era: era.toNumber(),
        rewards: rewards
    }]);
}

async function saveValidatorsWithRewards(validatorsWithRewards) {
    for(let validator of validatorsWithRewards) {
        for(let reward of validator.rewards) {
            const entity = new StakingReward(reward.id);

            entity.accountId = reward.account;
            entity.balance = reward.reward;
            entity.date = reward.date;
            entity.era = validator.era;
            entity.validator = validator.validator;

            await entity.save();
        }
    }
}

async function getValidatorFromRewardEvent(event: SubstrateEvent) {
    if(event.extrinsic.extrinsic.method.method.toString() === 'payoutStakers') {
        const [validator, era] = event.extrinsic.extrinsic.args;
        //@ts-ignore
        return [era.toNumber(), validator.toString(), false];
    }

    const {event: {data: [account, newReward]}} = event;
    const [calls] = event.extrinsic.extrinsic.args;
    let era = await getBlockEra(event.block);

    let validators = [];

    // @ts-ignore
    calls.map(function(call) {
        if(call.method.toString() === 'payoutStakers') {
            let [validator, callEra] = call.args;
            validators.push({
                validator: validator.toString(),
                era: callEra.toNumber()
            });
        }
    });

    if(validators.length === 0) {
        return [null, null, false];
    } else if(validators.length === 1) {
        return [validators[0].era, validators[0].validator, false];
    }

    let search = validators.findIndex(function (validator) {
        return validator === account.toString();
    });

    if(search !== undefined) {
        return [validators[search].era, account.toString(), false];
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

    logger.info(stakeValidators);

    throw new Error('just');


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
