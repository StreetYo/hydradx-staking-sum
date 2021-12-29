"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSlash = exports.handleSlashed = exports.handleReward = exports.handleRewarded = exports.handleBond = void 0;
const SumReward_1 = require("../types/models/SumReward");
const NoBondRecordAccount_1 = require("../types/models/NoBondRecordAccount");
function createSumReward(accountId) {
    const entity = new SumReward_1.SumReward(accountId);
    entity.accountReward = BigInt(0);
    entity.accountSlash = BigInt(0);
    entity.accountTotal = BigInt(0);
    return entity;
}
async function handleBond(event) {
    const { event: { data: [account, balance] } } = event;
    const entity = await SumReward_1.SumReward.get(account.toString());
    if (entity === undefined) {
        await createSumReward(account.toString()).save();
    }
}
exports.handleBond = handleBond;
async function handleRewarded(event) {
    await handleReward(event);
}
exports.handleRewarded = handleRewarded;
async function handleReward(event) {
    const { event: { data: [account, newReward] } } = event;
    let entity = await SumReward_1.SumReward.get(account.toString());
    if (entity === undefined) {
        // in early stage of kusama, some validators didn't need to bond to start staking
        // to not break our code, we will create a SumReward record for them and log them in NoBondRecordAccount
        entity = createSumReward(account.toString());
        const errorRecord = new NoBondRecordAccount_1.NoBondRecordAccount(account.toString());
        errorRecord.firstRewardAt = event.block.block.header.number.toNumber();
        await errorRecord.save();
    }
    entity.accountReward = entity.accountReward + newReward.toBigInt();
    entity.accountTotal = entity.accountReward - entity.accountSlash;
    await entity.save();
}
exports.handleReward = handleReward;
async function handleSlashed(event) {
    await handleSlash(event);
}
exports.handleSlashed = handleSlashed;
async function handleSlash(event) {
    const { event: { data: [account, newSlash] } } = event;
    let entity = await SumReward_1.SumReward.get(account.toString());
    if (entity === undefined) {
        // in early stage of kusama, some validators didn't need to bond to start staking
        // to not break our code, we will create a SumReward record for them and log them in NoBondRecordAccount
        entity = createSumReward(account.toString());
        const errorRecord = new NoBondRecordAccount_1.NoBondRecordAccount(account.toString());
        errorRecord.firstRewardAt = event.block.block.header.number.toNumber();
        await errorRecord.save();
    }
    entity.accountSlash = entity.accountSlash + newSlash.toBigInt();
    entity.accountTotal = entity.accountReward - entity.accountSlash;
    await entity.save();
}
exports.handleSlash = handleSlash;
