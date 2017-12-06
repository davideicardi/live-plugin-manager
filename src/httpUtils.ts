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

export async function httpJsonGet<T>(sourceUrl: string, headers?: Headers): Promise<T | undefined> {
	debug(`Get content from ${sourceUrl} ...`);
	const res = await fetch(sourceUrl, { headers: {...headers} });

	if (!res.ok) {
		throw new Error(`Response error ${res.status} ${res.statusText}`);
	}

	return res.json<T>();
}

export async function httpDownload(sourceUrl: string, destinationFile: string, headers?: Headers): Promise<void> {
	debug(`Download content from ${sourceUrl} ...`);
	const res = await fetch(sourceUrl, { headers: {...headers} });

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
