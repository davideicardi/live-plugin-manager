import fetch from "node-fetch";
import * as fs from "./fileSystem";
import * as Debug from "debug";
const debug = Debug("live-plugin-manager.HttpUtils");

export interface Headers {
	[name: string]: string;
}

export function headersBearerAuth(token: string): Headers {
	return {
		Authorization: "Bearer " + token
	};
}

export function headersTokenAuth(token: string): Headers {
	return {
		Authorization: "token " + token
	};
}

export function headersBasicAuth(username: string, password: string): Headers {
	return {
		Authorization: "Basic " + new Buffer(username + ":" + password).toString("base64")
	};
}

export async function httpJsonGet<T>(sourceUrl: string, headers?: Headers): Promise<T | undefined> {
	if (debug.enabled) {
		debug(`Json GET ${sourceUrl} ...`);
		debug("HEADERS", headers);
	}
	const res = await fetch(sourceUrl, { headers: {...headers} });

	if (debug.enabled) {
		debug("Response HEADERS", res.headers);
	}

	if (!res.ok) {
		throw new Error(`Response error ${res.status} ${res.statusText}`);
	}

	return res.json<T>();
}

export async function httpDownload(sourceUrl: string, destinationFile: string, headers?: Headers): Promise<void> {
	if (debug.enabled) {
		debug(`Download GET ${sourceUrl} ...`);
		debug("HEADERS", headers);
	}
	const res = await fetch(sourceUrl, { headers: {...headers} });

	if (debug.enabled) {
		debug("Response HEADERS", res.headers);
	}

	if (!res.ok) {
		throw new Error(`Response error ${res.status} ${res.statusText}`);
	}

	return new Promise<void>((resolve, reject) => {
		const fileStream = fs.createWriteStream(destinationFile);
		res.body.pipe(fileStream);

		res.body.on("error", (err) => {
			fileStream.close();
			if (fs.fileExists(destinationFile)) {
				fs.remove(destinationFile);
			}
			reject(err);
		});

		fileStream.on("finish", function() {
			fileStream.close();
			resolve();
		});
	});
}
