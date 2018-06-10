import * as SemVer from "semver";
import { PluginVersion } from "./PluginInfo";

export type SatisfyMode = "satisfies" | "satisfiesOrGreater";

export interface VersionRef {
	readonly raw: string;
}

export abstract class NpmVersionRef implements VersionRef {
	static tryParse(value?: string | NpmVersionRef | PluginVersion): NpmVersionRef | undefined {
		if (!value) {
			return DistTag.LATEST;
		}

		if (this.is(value)) {
			return value;
		} else if (typeof value === "string") {
			const distTag = DistTag.tryParse(value);
			if (distTag) {
				return distTag;
			}
			const versionRange = VersionRange.tryParse(value);
			if (versionRange) {
				return versionRange;
			}
		} else if (PluginVersion.is(value)) {
			return this.tryParse(value.semver.raw);
		} else {
			return undefined;
		}
	}
	static parse(value?: string | NpmVersionRef | PluginVersion): NpmVersionRef {
		const res = this.tryParse(value);
		if (!res) {
			throw new Error(`Invalid npm version reference ${value}`);
		}
		return res;
	}
	static is(value: any): value is NpmVersionRef {
		if (!value) {
			return false;
		}
		return (value as NpmVersionRef).isNpmVersionRef;
	}

	private readonly isNpmVersionRef = true;
	protected constructor(readonly raw: string) {
	}
}

export class GitHubRef implements VersionRef {
	static tryParse(value: string | GitHubRef): GitHubRef | undefined {
		if (typeof value !== "string") {
			return value;
		}

		// TODO Better parsing of github repo
		if (/^[\w\-\_]+\/[\w\-\_]+(#\w*)?$/.test(value)) {
			return new GitHubRef(value);
		}

		return undefined;
	}
	static parse(value: string | GitHubRef): GitHubRef {
		const res = this.tryParse(value);
		if (!res) {
			throw new Error(`Invalid github reference ${value}`);
		}
		return res;
	}
	static is(versionRef: VersionRef): versionRef is GitHubRef {
		return (versionRef as GitHubRef).isGitHubRef;
	}

	private readonly isGitHubRef = true;
	protected constructor(readonly raw: string) {
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

export class VersionRange extends NpmVersionRef {
	static tryParse(value: string | VersionRange | PluginVersion): VersionRange | undefined {
		if (this.is(value)) {
			return value;
		} else if (PluginVersion.is(value)) {
			return this.tryParse(value.semver.raw);
		} else if (typeof value === "string") {
			if (SemVer.validRange(value)) {
				return new VersionRange(new SemVer.Range(value));
			}
		} else {
			return undefined;
		}
	}
	static parse(value: string | VersionRange | PluginVersion): VersionRange {
		const res = this.tryParse(value);
		if (!res) {
			throw new Error(`Invalid version range ${value}`);
		}
		return res;
	}
	static is(value: any): value is VersionRange {
		if (!value) {
			return false;
		}
		return (value as VersionRange).isVersionRange;
	}

	private readonly isVersionRange = true;
	protected constructor(readonly range: SemVer.Range) {
		super(range.raw);
	}
}

export class DistTag extends NpmVersionRef {
	static readonly LATEST = new DistTag("latest");

	static tryParse(value: string | DistTag): DistTag | undefined {
		if (typeof value !== "string") {
			return value;
		}

		// TODO Better parsing of tags
		if (/^[\w\-\_]+$/.test(value)) {
			return new DistTag(value);
		}

		return undefined;
	}
	static parse(value: string | DistTag): DistTag {
		const res = this.tryParse(value);
		if (!res) {
			throw new Error(`Invalid dist tag ${value}`);
		}
		return res;
	}
	static is(versionRef: VersionRef): versionRef is DistTag {
		return (versionRef as DistTag).isDistTag;
	}

	private readonly isDistTag = true;
	protected constructor(readonly raw: string) {
		super(raw);
	}
}

export function parseVersionRef(rawValue?: string | VersionRef): VersionRef {
	const ref = tryParseVersionRef(rawValue);
	if (!ref) {
		throw new Error(`Invalid version reference ${rawValue}`);
	}

	return ref;
}

export function tryParseVersionRef(rawValue?: string | VersionRef): VersionRef | undefined {
	if (!rawValue) {
		return DistTag.LATEST;
	}
	if (typeof rawValue !== "string") {
		if (!rawValue.raw) {
			throw new Error("Invalid version reference");
		}
		return rawValue; // it should be already a VersionRef
	}

	// We should support all these types:
	//  https://docs.npmjs.com/files/package.json#dependencies

	return GitHubRef.tryParse(rawValue)
		|| NpmVersionRef.tryParse(rawValue);
}
