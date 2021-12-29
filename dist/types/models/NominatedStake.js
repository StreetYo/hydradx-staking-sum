"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NominatedStake = void 0;
const tslib_1 = require("tslib");
const assert_1 = (0, tslib_1.__importDefault)(require("assert"));
class NominatedStake {
    constructor(id) {
        this.id = id;
    }
    async save() {
        let id = this.id;
        (0, assert_1.default)(id !== null, "Cannot save NominatedStake entity without an ID");
        await store.set('NominatedStake', id.toString(), this);
    }
    static async remove(id) {
        (0, assert_1.default)(id !== null, "Cannot remove NominatedStake entity without an ID");
        await store.remove('NominatedStake', id.toString());
    }
    static async get(id) {
        (0, assert_1.default)((id !== null && id !== undefined), "Cannot get NominatedStake entity without an ID");
        const record = await store.get('NominatedStake', id.toString());
        if (record) {
            return NominatedStake.create(record);
        }
        else {
            return;
        }
    }
    static create(record) {
        (0, assert_1.default)(typeof record.id === 'string', "id must be provided");
        let entity = new NominatedStake(record.id);
        Object.assign(entity, record);
        return entity;
    }
}
exports.NominatedStake = NominatedStake;
