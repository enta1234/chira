import fs from 'fs'
import os from 'os'
const endOfLine = os.EOL

import rfs from 'rotating-file-stream'
import onHeaders from 'on-headers'
import onFinished from 'on-finished'
import cron from 'node-cron'

// DATE FORMAT
import dateFormat from 'dateformat'
import { IConfig } from './src/types/config'
import { CONFIG } from './src/configs/configs'
const dateFMT = 'yyyymmdd HH:MM:ss.l'
const dateFMTSQL = 'yyyy-mm-dd HH:MM:ss.l'
const fileFMT = 'yyyymmddHHMMss'

process.env.pm_id = process.env.pm_id || '0'
// let statNew
// let logStream

const loggingLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

interface LogMessage {
  LogType: string;
  Host: string;
  AppName: string;
  Instance: string;
  InputTimeStamp: string;
  Level: string;
  Session: string;
  Message: string;
}

const cTypeTXT = [
  'text/plain',
  'application/json',
  'text/xml',
  'text/html',
  'application/xml',
  'application/javascript',
  'text/css',
  'text/csv'
]

type ILogType = 'app'| 'smr' | 'dtl'

interface Stream {
  write?: (text: string) => void
  log?: (text: string) => void
}

class Chira { // Enhanced class name for clarity
  private isLoggingInitialized = false; // Clearer boolean name
  private config: IConfig = CONFIG;
  private sessionIdProvider: ((req: any, res: any) => string | undefined) | undefined; // Enhanced type for clarity
  private streamTasks: {
  app: Stream[]
  smr: Stream[]
  dtl: Stream[]
} = {
  app: [],
  smr: [],
  dtl: [],
};

  constructor(private express?: any) {} // Optional dependency injection

  init(_conf?: IConfig) {
    this.isLoggingInitialized = true;
    this.config = _conf || this.config // Concise merging of configuration

    if (this.config.log?.level === 'debug') { // Optional chaining for safety
      this.setupDebugLogging()
    }
  }

  private formatRequestMessage(req: any, res: any): string | object {
    if (this.config.log.format === 'json') {
      return {
        type: 'INCOMING',
        method: req.method.toLowerCase(),
        url: req.url,
        headers: req.headers,
        body: req.body,
      };
    } else {
      const txtLogReq = 'INCOMING|__METHOD=' + req.method.toLowerCase() +
        ' __URL=' + req.url +
        ' __HEADERS=' + JSON.stringify(req.headers) +
        ' __BODY=' + this.toStr(req.body)
      return txtLogReq
    }
  }

  private setupDebugLogging() {
    if (this.express) {
      this.express.use((req: any, res: any, next: any) => {
        req._reqTimeForLog = Date.now();
        const sid = this.sessionIdProvider?.(req, res); // Optional chaining for session ID
        const message = this.formatRequestMessage(req, res)
        this.debug(sid, message)
      });
    }
  }

  private log(level: keyof typeof loggingLevels, ...args: any[]) {
    if (loggingLevels[this.config.log.level] > loggingLevels[level]) return
    this.write('app', this.formatAppLog(level, ...args))
  }

  debug(...args: any[]) {
    this.log('debug', ...args)
  }

  info(...args: any[]) {
    this.log('info', ...args)
  }
  warn(...args: any[]) {
    this.log('warn', ...args)
  }
  error(...args: any[]) {
    this.log('error', ...args)
  }

  private toStr (txt: any) {
    if (txt instanceof Error) {
      return txt.message + ', ' + txt.stack
    } else if (txt instanceof Object) {
      return JSON.stringify(txt)
    } else {
      return txt
    }
  }

  private write(type: ILogType, txt: string) {
    try {
      const streams = this.streamTasks[type];
      if (streams) {
        for (const stream of streams) {
          try {
            stream.write ? stream.write(txt + endOfLine) : stream.log ? stream?.log(txt) : ''
          } catch (streamError) {
            console.error('Error writing to stream:', streamError)
          }
        }
      }
    } catch (error) {
      console.error('Error during logging:', error)
    }
  }

  private formatAppLog(level: keyof typeof loggingLevels, ...args: any[]): string {
    const formattedTxt = this.formatLogText(args);
    const session = formattedTxt.startsWith('|') ? formattedTxt.slice(1) : ''; // Extract session if present
    const text = formattedTxt.startsWith('|') ? formattedTxt.slice(session.length + 2) : formattedTxt; // Extract text

    return this.config.log.format === 'pipe'
      ? this.formatPipeLog(level, session, text)
      : this.formatJSONLog(level, session, text);
  }

  private formatLogText(_txt: any[]): string {
    const rtxt = _txt.map(this.toStr).join(' ') // Concisely join text parts
    return rtxt
  }

  private formatPipeLog(lvlAppLog: string, session: string, txt: string): string {
    return `${this.getDateTimeLogFormat(new Date())}|${session}|${lvlAppLog}|${txt}`
  }

  private formatJSONLog(level: string, session: string, text: string): string {
    const rawMsg: LogMessage = {
      LogType: 'App',
      Host: os.hostname(),
      AppName: this.config.projectName,
      Instance: process.env.pm_id || '0',
      InputTimeStamp: dateFormat(new Date(), dateFMT),
      Level: level,
      Session: session,
      Message: text, // Add text to the message structure
    };
    return JSON.stringify(rawMsg);
  }

  private getDateTimeLogFormat (currentDates: Date) {
    const years = currentDates.getFullYear()
    const months = currentDates.getMonth() + 1
    const day = currentDates.getDate()
    const hours = currentDates.getHours()
    const minutes = currentDates.getMinutes()
    const second = currentDates.getSeconds()
    const millisecs = currentDates.getMilliseconds()
    const monthFormatted = months < 10 ? '0' + months : months
    const dayFormatted = day < 10 ? '0' + day : day
    const hourFormatted = hours < 10 ? '0' + hours : hours
    const minFormatted = minutes < 10 ? '0' + minutes : minutes
    const secFormatted = second < 10 ? '0' + second : second
    let milliFormatted = null
  
    if (millisecs < 10) {
      milliFormatted = '00' + millisecs
    } else if (millisecs < 100) {
      milliFormatted = '0' + millisecs
    } else {
      milliFormatted = millisecs
    }
    const detail = '' + years + monthFormatted + dayFormatted + ' ' + hourFormatted + ':' + minFormatted + ':' + secFormatted + '.' + milliFormatted +
       '|' + os.hostname() +
       '|' + this.config.projectName +
       '|' + process.env.pm_id
    return detail
  }

  setSessionIdProvider(provider: (req: any, res: any) => string | undefined) {
    this.sessionIdProvider = provider;
  }
}
