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
	return res.json<T>();
}

export async function httpDownload(sourceUrl: string, destinationFile: string, headers?: Headers): Promise<void> {
	debug(`Download content from ${sourceUrl} ...`);
	const res = await fetch(sourceUrl, { headers: {...headers} });

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

	// using request
	// return new Promise<void>((resolve, reject) => {
	// 	const fileStream = fs.createWriteStream(destinationFile);
	// 	request
	// 		.get(sourceUrl)
	// 		.on("error", (err) => {
	// 			fileStream.close();
	// 			fs.remove(destinationFile);
	// 			reject(err);
	// 		})
	// 		.pipe(fileStream);

	// 	fileStream.on("finish", function() {
	// 		fileStream.close();
	// 		resolve();
	// 	});
	// });

	// code without using request...
	// return new Promise<void>((resolve, reject) => {
	// 	const fileStream = fs.createWriteStream(destinationFile);
	// 	const httpGet = (sourceUrl.toLowerCase().startsWith("https") ? https.get : http.get);
	// 	const request = httpGet(sourceUrl, function(response) {
	// 		response.pipe(fileStream);
	// 		fileStream.on("finish", function() {
	// 			fileStream.close();
	// 			resolve();
	// 		});
	// 	})
	// 	.on("error", function(err) {
	// 		fileStream.close();
	// 		fs.remove(destinationFile);
	// 		reject(err);
	// 	});
	// });
}
