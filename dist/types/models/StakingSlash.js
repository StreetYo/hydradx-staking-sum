"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingSlash = void 0;
const tslib_1 = require("tslib");
const assert_1 = (0, tslib_1.__importDefault)(require("assert"));
class StakingSlash {
    constructor(id) {
        this.id = id;
    }
    async save() {
        let id = this.id;
        (0, assert_1.default)(id !== null, "Cannot save StakingSlash entity without an ID");
        await store.set('StakingSlash', id.toString(), this);
    }
    static async remove(id) {
        (0, assert_1.default)(id !== null, "Cannot remove StakingSlash entity without an ID");
        await store.remove('StakingSlash', id.toString());
    }
    static async get(id) {
        (0, assert_1.default)((id !== null && id !== undefined), "Cannot get StakingSlash entity without an ID");
        const record = await store.get('StakingSlash', id.toString());
        if (record) {
            return StakingSlash.create(record);
        }
        else {
            return;
        }
    }
    static async getByAccountId(accountId) {
        const records = await store.getByField('StakingSlash', 'accountId', accountId);
        return records.map(record => StakingSlash.create(record));
    }
    static create(record) {
        (0, assert_1.default)(typeof record.id === 'string', "id must be provided");
        let entity = new StakingSlash(record.id);
        Object.assign(entity, record);
        return entity;
    }
}
exports.StakingSlash = StakingSlash;
