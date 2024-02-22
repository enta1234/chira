import express from 'express';
interface AppLogConfiguration {
    time: number;
    size: number | null;
    path: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    console: boolean;
    file: boolean;
    format: 'json' | 'pipe';
}
interface InfoLogConfiguration {
    time: number;
    size: number | null;
    path: string;
    console: boolean;
    file: boolean;
    rawData: boolean;
}
export interface Configuration {
    projectName: string;
    log: AppLogConfiguration;
    info: InfoLogConfiguration;
}
interface SessionIdProvider {
    (req: express.Request, res: express.Response): string | undefined;
}
declare class Chira {
    private logStream;
    private logLevel;
    private streamTask;
    private sessionIdProvider;
    private sessionId;
    constructor();
    private getLogFileName;
    private getConf;
    private generator;
    private createOpts;
    private createStream;
    private toStr;
    private printTxtJSON;
    private processAppLog;
    private processInfoLog;
    private getDateTimeLogFormat;
    private writeLog;
    debug(..._txt: any[]): void;
    info(..._txt: any[]): void;
    warn(..._txt: any[]): void;
    error(..._txt: any[]): void;
    private infoLog;
    ready(): boolean;
    init(_conf?: Configuration, _express?: express.Express): Chira;
    logger(sid?: string): {
        debug: (...x: any[]) => void;
        info: (...x: any[]) => void;
        warn: (...x: any[]) => void;
        error: (...x: any[]) => void;
    };
    private initializeLogger;
    private setLogLevel;
    private initLoggerMiddleware;
    private logResponseBody;
    setSessionId(callbackProvider: SessionIdProvider): void;
    close(cb?: (result: boolean) => void): void;
}
export default Chira;
