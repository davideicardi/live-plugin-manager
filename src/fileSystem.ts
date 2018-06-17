import * as fs from "fs-extra";
import * as path from "path";

export {createWriteStream} from "fs-extra";

// TODO To test
export function pathsAreEqual(fsPath1: string, fsPath2: string): boolean {
	fsPath1 = path.normalize(fsPath1);
	fsPath2 = path.normalize(fsPath2);

	return path.basename(fsPath1) === path.basename(fsPath2)
		&& path.dirname(fsPath1) === path.dirname(fsPath2);
}

export function remove(fsPath: string): Promise<void> {
	return fs.remove(fsPath);
}

export async function getDirectories(fsPath: string): Promise<string[]> {
	const dirContent = await fs.readdir(fsPath);

	return Promise.all(dirContent
		.map((d) => path.join(fsPath, d))
		.filter((fullPath) => {
			return directoryExists(fullPath);
		}));
}

export async function directoryExists(fsPath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(fsPath);

		return stats.isDirectory();
	} catch (err) {
		if (err.code === "ENOENT") {
			return false;
		}

		throw err;
	}
}

export async function fileExists(fsPath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(fsPath);

		return stats.isFile();
	} catch (err) {
		if (err.code === "ENOENT") {
			return false;
		}

		throw err;
	}
}

export function ensureDir(fsPath: string): Promise<void> {
	return fs.ensureDir(fsPath);
}

export function readFile(fsPath: string, encoding: string): Promise<string> {
	return fs.readFile(fsPath, encoding);
}

export function readJsonFile(fsPath: string): Promise<any> {
	return fs.readJson(fsPath);
}

export function writeFile(fsPath: string, content: string, encoding?: string): Promise<void> {
	return fs.writeFile(fsPath, content, {encoding});
}

export function copy(src: string, dest: string, options?: Partial<CopyOptions>): Promise<void> {

	const excludeList = options && options.exclude
		? options.exclude.map((f) => path.join(src, f).toLowerCase())
		: [];

	const filter = (filterSrc: string, filterDest: string) => {
		filterSrc = filterSrc.toLowerCase();

		if (excludeList.indexOf(filterSrc) >= 0) {
			return false;
		}
		return true;
	};

	return fs.copy(src, dest, { filter });
}

export interface CopyOptions {
	exclude: string[];
}
