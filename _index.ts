import fs from 'fs';
import os from 'os';
import { EOL } from 'os';
import rfs from 'rotating-file-stream';
import mkdirp from 'mkdirp';
import onHeaders from 'on-headers';
import onFinished from 'on-finished';
import cron from 'node-cron';
import dateFormat from 'dateformat';

const dateFMT: string = 'yyyymmdd HH:MM:ss.l';
const dateFMTSQL: string = 'yyyy-mm-dd HH:MM:ss.l';
const fileFMT: string = 'yyyymmddHHMMss';

const cTypeTXT: string[] = [
  'text/plain',
  'application/json',
  'text/xml',
  'text/html',
  'application/xml',
  'application/javascript',
  'text/css',
  'text/csv'
];

interface Configuration {
  projectName: string;
  log: LogConfiguration;
  summary: SummaryConfiguration;
  detail: DetailConfiguration;
}

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

interface StreamTask {
  app: rfs.RotatingFileStream[];
  smr: rfs.RotatingFileStream[];
  dtl: rfs.RotatingFileStream[];
}

interface RawMessage {
  LogType: string;
  Host: string;
  AppName: string;
  Instance: string;
  InputTimeStamp: string | null;
  Level: string;
  Session?: string;
  Message: string;
  Stack?: string;
}

interface DetailLog {
  LogType: string;
  Host: string;
  AppName: string;
  Instance: string;
  Session: string;
  InitInvoke: string;
  Scenario: string;
  Identity: string;
  InputTimeStamp: string | null;
  Input: InputLog[];
  OutputTimeStamp: string | null;
  Output: OutputLog[];
  ProcessingTime: string | null;

  setIdentity(identity: string): void;
  isRawDataEnabled(): boolean;
  addInputRequest(node: string, cmd: string, invoke: string, rawData: string, data: any, protocol: string, protocolMethod: string): void;
  addInputResponse(node: string, cmd: string, invoke: string, rawData: string, data: any, resTime: number): void;
  addInputResponseTimeout(node: string, cmd: string, invoke: string): void;
  addInputResponseError(node: string, cmd: string, invoke: string): void;
  addOutputRequest(node: string, cmd: string, invoke: string, rawData: string, data: any, protocol: string, protocalMethod: string): void;
  addOutputResponse(node: string, cmd: string, invoke: string, rawData: string, data: any): void;
  addOutputRequestRetry(node: string, cmd: string, invoke: string, rawData: string, data: any, total: number, maxCount: number): void;
  end(): void;
  _clr(): void;
  _buildValueProtocol(protocol: string, protocolMethod: string): string | undefined;
}

interface InputLog {
  Invoke: string;
  Event: string;
  Protocol?: string;
  Type: string;
  RawData?: string;
  Data: any;
  ResTime?: number | string;
}

interface OutputLog {
  Invoke: string;
  Event: string;
  Protocol?: string;
  Type: string;
  RawData?: string;
  Data: any;
}

interface SummaryLog {
  requestTime: Date;
  session: string;
  initInvoke: string;
  cmd: string;
  identity: string;
  blockDetail: BlockDetail[];
  optionalField?: Record<string, any>;

  addField(fieldName: string, fieldValue: any): void;
  addSuccessBlock(node: string, cmd: string, resultCode: string, resultDesc: string): void;
  addErrorBlock(node: string, cmd: string, resultCode: string, resultDesc: string): void;
  endASync(responseResult: string, responseDesc: string, transactionResult: string, transactionDesc: string): void;
  setIdentity(identity: string): void;
  isEnd(): boolean;
  end(resultCode: string, resultDescription: string): void;
}

interface BlockDetail {
  node: string;
  cmd: string;
  count: number;
  result: Result[];
}

interface Result {
  resultCode: string;
  resultDesc: string;
  count: number;
}

const log: {
  initLog: boolean;
  debug(..._log: any[]): void;
  info(..._log: any[]): void;
  warn(..._log: any[]): void;
  error(..._log: any[]): void;
  detail(session: string, initInvoke: string, scenario: string, identity: string): DetailLog;
  summary(session: string, initInvoke: string, cmd: string, identity: string): SummaryLog;
  ready(): boolean;
  init(_conf?: Configuration, express?: any): typeof log;
  close(cb?: (result: boolean) => void): void;
} = {} as any;
