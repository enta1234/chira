import express from 'express';
interface AppLogConfiguration {
    time: number;
    size: number | null;
    path: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    console: boolean;
    file: boolean;
}
interface InfoLogConfiguration {
    time: number;
    size: number | null;
    path: string;
    console: boolean;
    file: boolean;
}
export interface Configuration {
    projectName: string;
    log: AppLogConfiguration;
    info?: InfoLogConfiguration;
}
export type Logger = {
    debug: (...x: any[]) => void;
    info: (...x: any[]) => void;
    warn: (...x: any[]) => void;
    error: (...x: any[]) => void;
};
interface SessionIdProvider {
    (req: express.Request, res: express.Response): string | undefined;
}
declare class Chira {
    private logStream;
    private logLevel;
    private streamTask;
    private sessionIdProvider;
    private sessionId;
    logger: any;
    constructor();
    private getLogFileName;
    private getConf;
    private generator;
    private createOpts;
    private createStream;
    private printTxtJSON;
    private processAppLog;
    private processInfoLog;
    private getDateTimeLogFormat;
    private writeLog;
    private debug;
    private info;
    private warn;
    private error;
    private infoLog;
    ready(): boolean;
    init(_conf?: Configuration, _express?: express.Express): Chira;
    getLogger(sid?: string): Logger;
    private initializeLogger;
    private setLogLevel;
    private initInfoLogger;
    private logResponseBody;
    setSessionId(callbackProvider: SessionIdProvider): void;
    close(cb?: (result: boolean) => void): void;
}
export default Chira;
