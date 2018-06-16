"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SemVer = require("semver");
const PluginInfo_1 = require("./PluginInfo");
class NpmVersionRef {
    constructor(raw) {
        this.raw = raw;
        this.isNpmVersionRef = true;
    }
    static tryParse(value) {
        if (!value) {
            return DistTag.LATEST;
        }
        if (this.is(value)) {
            return value;
        }
        else if (typeof value === "string") {
            const distTag = DistTag.tryParse(value);
            if (distTag) {
                return distTag;
            }
            const versionRange = VersionRange.tryParse(value);
            if (versionRange) {
                return versionRange;
            }
        }
        else if (PluginInfo_1.PluginVersion.is(value)) {
            return this.tryParse(value.semver.raw);
        }
        else {
            return undefined;
        }
    }
    static parse(value) {
        const res = this.tryParse(value);
        if (!res) {
            throw new Error(`Invalid npm version reference ${value}`);
        }
        return res;
    }
    static is(value) {
        if (!value) {
            return false;
        }
        return value.isNpmVersionRef;
    }
}
exports.NpmVersionRef = NpmVersionRef;
class GitHubRef {
    constructor(raw) {
        this.raw = raw;
        this.isGitHubRef = true;
    }
    static tryParse(value) {
        if (typeof value !== "string") {
            return value;
        }
        // TODO Better parsing of github repo
        if (/^[\w\-\_]+\/[\w\-\_]+(#\w*)?$/.test(value)) {
            return new GitHubRef(value);
        }
        return undefined;
    }
    static parse(value) {
        const res = this.tryParse(value);
        if (!res) {
            throw new Error(`Invalid github reference ${value}`);
        }
        return res;
    }
    static is(versionRef) {
        if (!versionRef) {
            return false;
        }
        return versionRef.isGitHubRef;
    }
    getInfo() {
        const parts = this.raw.split("/");
        if (parts.length !== 2) {
            throw new Error("Invalid repository name");
        }
        const repoParts = parts[1].split("#");
        const repoInfo = {
            owner: parts[0],
            repo: repoParts[0],
            ref: repoParts[1] || "master"
        };
        return repoInfo;
    }
}
exports.GitHubRef = GitHubRef;
class VersionRange extends NpmVersionRef {
    constructor(range) {
        super(range.raw);
        this.range = range;
        this.isVersionRange = true;
    }
    static tryParse(value) {
        if (this.is(value)) {
            return value;
        }
        else if (PluginInfo_1.PluginVersion.is(value)) {
            return this.tryParse(value.semver.raw);
        }
        else if (typeof value === "string") {
            if (SemVer.validRange(value)) {
                return new VersionRange(new SemVer.Range(value));
            }
        }
        else {
            return undefined;
        }
    }
    static parse(value) {
        const res = this.tryParse(value);
        if (!res) {
            throw new Error(`Invalid version range ${value}`);
        }
        return res;
    }
    static is(value) {
        if (!value) {
            return false;
        }
        return value.isVersionRange;
    }
}
exports.VersionRange = VersionRange;
class DistTag extends NpmVersionRef {
    constructor(raw) {
        super(raw);
        this.raw = raw;
        this.isDistTag = true;
    }
    static tryParse(value) {
        if (typeof value !== "string") {
            return value;
        }
        // TODO Better parsing of tags
        if (/^[\w\-\_]+$/.test(value)) {
            return new DistTag(value);
        }
        return undefined;
    }
    static parse(value) {
        const res = this.tryParse(value);
        if (!res) {
            throw new Error(`Invalid dist tag ${value}`);
        }
        return res;
    }
    static is(versionRef) {
        if (!versionRef) {
            return false;
        }
        return versionRef.isDistTag;
    }
}
DistTag.LATEST = new DistTag("latest");
exports.DistTag = DistTag;
function parseVersionRef(rawValue) {
    const ref = tryParseVersionRef(rawValue);
    if (!ref) {
        throw new Error(`Invalid version reference ${rawValue}`);
    }
    return ref;
}
exports.parseVersionRef = parseVersionRef;
function tryParseVersionRef(rawValue) {
    if (!rawValue) {
        return DistTag.LATEST;
    }
    if (typeof rawValue === "string") {
        // We should support all these types:
        //  https://docs.npmjs.com/files/package.json#dependencies
        return GitHubRef.tryParse(rawValue)
            || NpmVersionRef.tryParse(rawValue);
    }
    if (PluginInfo_1.PluginVersion.is(rawValue)) {
        return VersionRange.tryParse(rawValue);
    }
    if (!rawValue.raw) {
        return undefined;
    }
    return rawValue; // it should be already a VersionRef
}
exports.tryParseVersionRef = tryParseVersionRef;
//# sourceMappingURL=VersionRef.js.map