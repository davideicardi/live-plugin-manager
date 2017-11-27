import * as fs from "fs-extra";
import * as path from "path";

export {createWriteStream} from "fs-extra";

export function remove(fsPath: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.remove(fsPath, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

export function exists(fsPath: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		fs.exists(fsPath, (pathExists) => {
			resolve(pathExists);
		});
	});
}

export function ensureDir(fsPath: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.ensureDir(fsPath, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

export function readFile(fsPath: string, encoding: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(fsPath, encoding, (err, data) => {
			if (err) {
				return reject(err);
			}
			resolve(data);
		});
	});
}

export function writeFile(fsPath: string, content: string, encoding?: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.writeFile(fsPath, content, {encoding}, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
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

	return new Promise<void>((resolve, reject) => {
		fs.copy(src, dest, { filter } , (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

export interface CopyOptions {
	exclude: string[];
}
