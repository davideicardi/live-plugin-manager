"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SemVer = require("semver");
class PluginName {
    constructor(raw) {
        this.raw = raw;
        this.isPluginName = true;
    }
    static tryParse(value) {
        if (!value) {
            return undefined;
        }
        if (typeof value !== "string" && this.is(value)) {
            return value;
        }
        if (isValidPluginName(value)) {
            return new PluginName(value);
        }
        return undefined;
    }
    static parse(value) {
        const res = this.tryParse(value);
        if (!res) {
            throw new Error(`Invalid plugin name ${value}`);
        }
        return res;
    }
    static is(value) {
        return value.isPluginName;
    }
}
exports.PluginName = PluginName;
class PluginVersion {
    constructor(semver) {
        this.semver = semver;
    }
    static tryParse(value) {
        if (!value) {
            return undefined;
        }
        if (typeof value !== "string" && this.is(value)) {
            return value;
        }
        const sv = SemVer.coerce(value);
        if (sv) {
            return new PluginVersion(sv);
        }
        return undefined;
    }
    static parse(value) {
        const res = this.tryParse(value);
        if (!res) {
            throw new Error(`Invalid plugin version ${value}`);
        }
        return res;
    }
    static is(value) {
        return !!value.semver;
    }
}
exports.PluginVersion = PluginVersion;
// TODO Eval to be more strict...
function isValidPluginName(name) {
    if (typeof name !== "string") {
        return false;
    }
    if (name.length === 0) {
        return false;
    }
    // '/' is permitted to support scoped packages
    if (name.startsWith(".")
        || name.indexOf("\\") >= 0) {
        return false;
    }
    return true;
}
//# sourceMappingURL=PluginInfo.js.map