"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NominatedAmount = void 0;
const tslib_1 = require("tslib");
const assert_1 = (0, tslib_1.__importDefault)(require("assert"));
class NominatedAmount {
    constructor(id) {
        this.id = id;
    }
    async save() {
        let id = this.id;
        (0, assert_1.default)(id !== null, "Cannot save NominatedAmount entity without an ID");
        await store.set('NominatedAmount', id.toString(), this);
    }
    static async remove(id) {
        (0, assert_1.default)(id !== null, "Cannot remove NominatedAmount entity without an ID");
        await store.remove('NominatedAmount', id.toString());
    }
    static async get(id) {
        (0, assert_1.default)((id !== null && id !== undefined), "Cannot get NominatedAmount entity without an ID");
        const record = await store.get('NominatedAmount', id.toString());
        if (record) {
            return NominatedAmount.create(record);
        }
        else {
            return;
        }
    }
    static create(record) {
        (0, assert_1.default)(typeof record.id === 'string', "id must be provided");
        let entity = new NominatedAmount(record.id);
        Object.assign(entity, record);
        return entity;
    }
}
exports.NominatedAmount = NominatedAmount;
