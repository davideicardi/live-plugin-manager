export interface Headers {
    [name: string]: string;
}
export declare function headersBearerAuth(token: string): Headers;
export declare function headersTokenAuth(token: string): Headers;
export declare function headersBasicAuth(username: string, password: string): Headers;
export declare function httpJsonGet<T>(sourceUrl: string, headers?: Headers): Promise<T | undefined>;
export declare function httpDownload(sourceUrl: string, destinationFile: string, headers?: Headers): Promise<void>;
