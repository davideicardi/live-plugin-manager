import * as httpUtils from "./httpUtils";
export declare function extractTarball(tgzFile: string, destinationDirectory: string): Promise<void>;
export declare function downloadTarball(url: string, headers?: httpUtils.Headers): Promise<string>;
