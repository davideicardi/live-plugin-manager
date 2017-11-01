import * as request from "request";
import * as fs from "./fileSystem";

export function httpDownload(sourceUrl: string, destinationFile: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const fileStream = fs.createWriteStream(destinationFile);
		request
			.get(sourceUrl)
			.on("error", (err) => {
				fileStream.close();
				fs.remove(destinationFile);
				reject(err);
			})
			.pipe(fileStream);

		fileStream.on("finish", function() {
			fileStream.close();
			resolve();
		});
	});

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
