import * as fs from "fs-extra";

export {createWriteStream} from "fs-extra";

export function remove(path: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.remove(path, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

export function exists(path: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		fs.exists(path, (exists) => {
			resolve(exists);
		});
	});
}

export function ensureDir(path: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.ensureDir(path, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

export function readFile(path: string, encoding: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(path, encoding, (err, data) => {
			if (err) {
				return reject(err);
			}
			resolve(data);
		});
	});
}

export function copy(src: string, dest: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.copy(src, dest, (err) => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}
