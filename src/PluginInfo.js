"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SemVer = require("semver");
const VersionRef_1 = require("./VersionRef");
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
    toString() {
        return this.raw;
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
        if (!value) {
            return false;
        }
        return !!value.semver;
    }
    toString() {
        return this.semver.raw;
    }
}
exports.PluginVersion = PluginVersion;
class PluginInfo {
    constructor(mainFile, location, name, version, requestedVersion, dependencies) {
        this.mainFile = mainFile;
        this.location = location;
        this.name = name;
        this.version = version;
        this.requestedVersion = requestedVersion;
        this.dependencies = dependencies;
    }
    satisfies(name, version, mode = "satisfies") {
        if (this.name.raw !== name.raw) {
            return false;
        }
        if (!version) {
            return true;
        }
        return this.satisfiesVersion(version, mode);
    }
    satisfiesVersion(version, mode = "satisfies") {
        const rangeVersion = VersionRef_1.VersionRange.is(version)
            ? version
            : VersionRef_1.VersionRange.parse(version.semver.raw);
        const result = SemVer.satisfies(this.version.semver, rangeVersion.range);
        if (result) {
            return true;
        }
        else if (mode === "satisfiesOrGreater") {
            return SemVer.gtr(this.version.semver, rangeVersion.range);
        }
        else {
            return false;
        }
    }
}
exports.PluginInfo = PluginInfo;
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