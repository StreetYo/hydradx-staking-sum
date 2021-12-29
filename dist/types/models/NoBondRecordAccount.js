"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoBondRecordAccount = void 0;
const tslib_1 = require("tslib");
const assert_1 = (0, tslib_1.__importDefault)(require("assert"));
class NoBondRecordAccount {
    constructor(id) {
        this.id = id;
    }
    async save() {
        let id = this.id;
        (0, assert_1.default)(id !== null, "Cannot save NoBondRecordAccount entity without an ID");
        await store.set('NoBondRecordAccount', id.toString(), this);
    }
    static async remove(id) {
        (0, assert_1.default)(id !== null, "Cannot remove NoBondRecordAccount entity without an ID");
        await store.remove('NoBondRecordAccount', id.toString());
    }
    static async get(id) {
        (0, assert_1.default)((id !== null && id !== undefined), "Cannot get NoBondRecordAccount entity without an ID");
        const record = await store.get('NoBondRecordAccount', id.toString());
        if (record) {
            return NoBondRecordAccount.create(record);
        }
        else {
            return;
        }
    }
    static create(record) {
        (0, assert_1.default)(typeof record.id === 'string', "id must be provided");
        let entity = new NoBondRecordAccount(record.id);
        Object.assign(entity, record);
        return entity;
    }
}
exports.NoBondRecordAccount = NoBondRecordAccount;
