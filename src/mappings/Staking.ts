import {NominatedAmount, NominatedStake, StakingReward, StakingSlash} from '../types/models';
import {SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import {Balance} from '@polkadot/types/interfaces';

const md5 = require('md5');

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

export async function handlePayoutStakers(extrinsic: SubstrateExtrinsic): Promise<void> {
    let rewards = getRewardsFromExtrinsic(extrinsic);

    if (rewards.length === 0) {
        return;
    }

    let [validator, era] = extrinsic.extrinsic.args;

    // @ts-ignore
    await loadNominatedStakes(validator.toString(), era.toNumber())

    await saveValidatorsWithRewards([{
        validator: validator.toString(),
        // @ts-ignore
        era: era.toNumber(),
        rewards: rewards
    }]);
}

export async function handlePayoutStakersBatch(extrinsic: SubstrateExtrinsic): Promise<void> {
    let validators = [];
    let currentEvent = 0;
    let validatorsNominators = [];
    let calls = [];

    if (extrinsic.extrinsic.method.method.toString().toLowerCase() === 'batch') {
        let [extrCalls] = extrinsic.extrinsic.args;
        // @ts-ignore
        calls = extrCalls;
    } else {
        calls.push(extrinsic.extrinsic);
    }

    let rewards = getRewardsFromExtrinsic(extrinsic);

    if (rewards.length === 0) {
        return;
    }

    for (let call of calls) {
        if (call.method.toString() === 'payoutStakers') {
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

    if (validators.length === 0) {
        return;
    }

    for (let validatorI in validators) {
        if (rewards[currentEvent].account === validators[validatorI].validator) {
            validators[validatorI].rewards.push(rewards[currentEvent]);
            currentEvent++;
        }

        for (let nominator of validatorsNominators[validatorI]) {
            if (
                currentEvent === rewards.length ||
                rewards[currentEvent].account !== nominator.who
            ) break;

            validators[validatorI].rewards.push(rewards[currentEvent]);
            currentEvent++;
        }
    }

    await saveValidatorsWithRewards(validators);
}



async function loadLockedBalancesByNominators(nominators, era) {
    // @ts-ignore
    let balances = await api.query.balances.locks.multi(nominators);

    // @ts-ignore
    for (let nominatorI in nominators) {
        await createNominatedAmount(
            nominators[nominatorI],
            era,
            balances[nominatorI][0].amount.toBigInt()
        );
    }
}

async function loadNominatedStakes(validator: string, era) {
    era = parseInt(era);

    let nominators = await api.query.staking.erasStakers(era, validator);
    let nomins = [];

    // @ts-ignore
    for (let nominator of nominators.others) {
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

    await loadLockedBalancesByNominators(nomins.map(nominator => nominator.who), era);

    await createNominatedAmount(
        validator.toString(),
        era,
        // @ts-ignore
        nominators.own.toBigInt()
    );

    await createNominatedStake(
        era,
        validator.toString(),
        validator.toString(),
        //@ts-ignore
        nominators.own.toBigInt()
    );

    return nomins;
}

async function createNominatedStake(era, accountId, validator, nominated) {
    let id = md5(accountId + validator + era);
    let nominatedStake = await NominatedStake.get(id);

    if (nominatedStake === undefined) {
        nominatedStake = new NominatedStake(id);
        nominatedStake.account = accountId;
        nominatedStake.validator = validator;
        nominatedStake.era = era;
        nominatedStake.nominated = nominated;
        await nominatedStake.save();
    }
}

async function createNominatedAmount(account, era, amount) {
    let id = md5(account + era);
    let nominatedStake = await NominatedAmount.get(id);

    if (nominatedStake === undefined) {
        nominatedStake = new NominatedAmount(id);
        nominatedStake.account = account;
        nominatedStake.era = era;
        nominatedStake.amount = amount;
        await nominatedStake.save();
    }
}

function getRewardsFromExtrinsic(extrinsic: SubstrateExtrinsic) {
    let rewards = [];

    for (let [index, event] of extrinsic.events.entries()) {
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

async function saveValidatorsWithRewards(validatorsWithRewards) {
    for (let validator of validatorsWithRewards) {
        for (let reward of validator.rewards) {
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
