import * as SemVer from "semver";
import { VersionRange, VersionRef } from "./VersionRef";

export interface IPluginInfo {
	readonly mainFile: string;
	readonly location: string;
	readonly name: PluginName;
	readonly version: PluginVersion;
	readonly requestedVersion: VersionRef;
	readonly dependencies: Map<PluginName, VersionRef>;
	match(name: PluginName, version?: PluginVersion | VersionRange): boolean;
}

export class PluginName {
	static tryParse(value?: string | PluginName): PluginName | undefined {
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
	static parse(value?: string | PluginName): PluginName {
		const res = this.tryParse(value);
		if (!res) {
			throw new Error(`Invalid plugin name ${value}`);
		}
		return res;
	}
	static is(value: PluginName): value is PluginName {
		return value.isPluginName;
	}

	private readonly isPluginName = true;
	protected constructor(readonly raw: string) {
	}

	toString() {
		return this.raw;
	}
}

export class PluginVersion {
	static tryParse(value?: string | PluginVersion): PluginVersion | undefined {
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
	static parse(value?: string | PluginVersion): PluginVersion {
		const res = this.tryParse(value);
		if (!res) {
			throw new Error(`Invalid plugin version ${value}`);
		}
		return res;
	}
	static is(value: PluginVersion): value is PluginVersion {
		return !!value.semver;
	}

	protected constructor(readonly semver: SemVer.SemVer) {
	}

	toString() {
		return this.semver.raw;
	}
}

export class PluginInfo {
	constructor(
		readonly mainFile: string,
		readonly location: string,
		readonly name: PluginName,
		readonly version: PluginVersion,
		readonly requestedVersion: VersionRef,
		readonly dependencies: Map<PluginName, VersionRef>) {
	}

	match(name: PluginName, version?: PluginVersion | VersionRange): boolean {
		if (this.name.raw !== name.raw) {
			return false;
		}

		if (!version) {
			return true;
		}

		const rangeVersion = VersionRange.is(version)
			? version
			: VersionRange.parse(version.semver.raw);

		return rangeVersion.range.test(this.version.semver);
	}
}

// TODO Eval to be more strict...
function isValidPluginName(name: string) {
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
