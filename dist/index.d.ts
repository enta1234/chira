import express from 'express';
interface LogConfiguration {
    time: number | null;
    size: number | null;
    path: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    console: boolean;
    file: boolean;
    autoAddResBody: boolean;
    format: 'json' | 'pipe';
}
interface SummaryConfiguration {
    time: number;
    size: number | null;
    path: string;
    console: boolean;
    file: boolean;
    format: 'json' | 'pipe';
}
interface DetailConfiguration {
    time: number;
    size: number | null;
    path: string;
    console: boolean;
    file: boolean;
    rawData: boolean;
}
interface Configuration {
    projectName: string;
    log: LogConfiguration;
    summary: SummaryConfiguration;
    detail: DetailConfiguration;
}
declare class Chira {
    private logStream;
    private logLevel;
    private streamTask;
    private sessionIdProvider;
    constructor();
    private getLogFileName;
    private getSummaryFileName;
    private getDetailFileName;
    private getConf;
    private generator;
    private createOpts;
    private createStream;
    private toStr;
    private printTxtJSON;
    private processAppLog;
    private getDateTimeLogFormat;
    private writeLog;
    debug(..._txt: any[]): void;
    info(..._txt: any[]): void;
    warn(..._txt: any[]): void;
    error(..._txt: any[]): void;
    ready(): boolean;
    init(_conf?: Configuration, _express?: express.Express): Chira;
    private initializeLogger;
    private setLogLevel;
    private initLoggerMiddleware;
    private logResponseBody;
    private checkCType;
    setSessionId(provider: (req: any, res: any) => string | undefined): void;
    close(cb?: (result: boolean) => void): void;
}
export default Chira;
