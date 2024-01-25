import fs from 'fs'
import os from 'os'
import rfs from 'rotating-file-stream'
import mkdirp from 'mkdirp'
import onHeaders from 'on-headers'
import onFinished from 'on-finished'
// import dateFormat from 'dateformat'
import cron from 'node-cron'

import express from 'express'

const endOfLine: string = os.EOL
const dateFormat = (a:any, b:any) => 'dateFormat'

const dateFMT: string = 'yyyymmdd HH:MM:ss.l'
const dateFMTSQL: string = 'yyyy-mm-dd HH:MM:ss.l'
const fileFMT: string = 'yyyymmddHHMMss'

const cTypeTXT: string[] = [
  'text/plain',
  'application/json',
  'text/xml',
  'text/html',
  'application/xml',
  'application/javascript',
  'text/css',
  'text/csv',
]

interface LogConfiguration {
  time: number | null
  size: number | null
  path: string
  level: 'debug' | 'info' | 'warn' | 'error'
  console: boolean
  file: boolean
  autoAddResBody: boolean
  format: 'json' | 'pipe'
}

interface SummaryConfiguration {
  time: number
  size: number | null
  path: string
  console: boolean
  file: boolean
  format: 'json' | 'pipe'
}

interface DetailConfiguration {
  time: number
  size: number | null
  path: string
  console: boolean
  file: boolean
  rawData: boolean
}

type ConfigurationType = LogConfiguration | SummaryConfiguration | DetailConfiguration

declare namespace Express {
  export interface Request {
    _reqTimeForLog?: number
  }
}

interface Configuration {
  projectName: string
  log: LogConfiguration
  summary: SummaryConfiguration
  detail: DetailConfiguration
}

let conf: Configuration = {
  projectName: 'PROJECT_NAME',
  log: {
    time: 15,
    size: null,
    path: './appLogPath/',
    level: 'debug',
    console: true,
    file: true,
    autoAddResBody: true,
    format: 'json',
  },
  summary: {
    time: 15,
    size: null,
    path: './summaryPath/',
    console: false,
    file: true,
    format: 'json',
  },
  detail: {
    time: 15,
    size: null,
    path: './detailPath/',
    console: false,
    file: true,
    rawData: false
  },
}

interface RawMessage {
  LogType: string
  Host: string
  AppName: string
  Instance: string
  InputTimeStamp: string | null
  Level: string
  Session?: string
  Message: string
  Stack?: string
}

interface StreamTask {
  app: rfs.RotatingFileStream[]
  smr: rfs.RotatingFileStream[]
  dtl: rfs.RotatingFileStream[]
}

class Chira {
  private logStream: any // Type accordingly
  private logLevel: number = 0
  private streamTask: StreamTask

  constructor() {
    this.logStream = null
    this.streamTask = {
      app: [],
      smr: [],
      dtl: [],
    }
  }

  private getLogFileName(date: Date, index: number | undefined): string {
    return (
      os.hostname() +
      '_' +
      conf.projectName +
      (date ? ('_' + dateFormat(date, fileFMT)) : '') +
      (index ? '.' + index : '') +
      '.' +
      process.env.pm_id +
      '.log'
    )
  }

  private getSummaryFileName(date: Date, index: number | undefined): string {
    return (
      os.hostname() +
      '_' +
      conf.projectName +
      (date ? ('_' + dateFormat(date, fileFMT)) : '') +
      (index ? '.' + index : '') +
      '.' +
      process.env.pm_id +
      '.sum'
    )
  }

  private getDetailFileName(date: Date, index: number | undefined): string {
    return (
      os.hostname() +
      '_' +
      conf.projectName +
      (date ? ('_' + dateFormat(date, fileFMT)) : '') +
      (index ? '.' + index : '') +
      '.' +
      process.env.pm_id +
      '.detail'
    )
  }

  private getConf(type: string): ConfigurationType {
    if (type === 'app') return conf.log
    else if (type === 'smr') return conf.summary
    else if (type === 'dtl') return conf.detail
    return conf.log // Default to app configuration
  }

  private generator(type: string): (time: Date, index: number | undefined) => string {
    return (time, index) => {
      if (type === 'app') return this.getLogFileName(time, index)
      else if (type === 'smr') return this.getSummaryFileName(time, index)
      else if (type === 'dtl') return this.getDetailFileName(time, index)
      return this.getLogFileName(time, index) // Default to app log file name
    }
  }

  private createOpts(conf: ConfigurationType): rfs.Options {
    const o: rfs.Options = {
      path: conf.path,
    }
    if (conf.size) o.size = conf.size + 'K'
    if (conf.time) o.interval = conf.time + 'm'
    return o
  }

  private createStream(type: string): any {
    const conf = this.getConf(type)
    const stream = rfs.createStream(this.generator(type) as rfs.Generator, this.createOpts(conf))
    stream.on('error', function (err: Error) {
      console.error(err)
    })
    return stream
  }

  private toStr(txt: any): string {
    if (txt instanceof Error) {
      return txt.message + ', ' + txt.stack
    } else if (txt instanceof Object) {
      return JSON.stringify(txt)
    } else {
      return txt
    }
  }

  private printTxtJSON(rawMsg: any, _txt: any): void {
    if (_txt instanceof Error) {
      rawMsg.Message = _txt.message
      rawMsg.Stack = _txt.stack
    } else {
      rawMsg.Message = _txt
    }
  }

  private processAppLog(lvlAppLog: string, ..._txt: any[]): string {
    if (conf.log.format === 'pipe') {
      let session
      let txtMsg = ''
      if (_txt instanceof Array) {
        if (_txt.length > 1) {
          session = _txt[0]
          txtMsg = this.toStr(_txt[1])
          for (let i = 2; i < _txt.length; i++) {
            txtMsg += ' ' + this.toStr(_txt[i])
          }
        } else {
          session = ''
          txtMsg = this.toStr(_txt[0])
        }
      } else {
        session = ''
        txtMsg = this.toStr(_txt)
      }
      return `${this.getDateTimeLogFormat(new Date())}|${session}|${lvlAppLog}|${txtMsg}`
    } else {
      const rawMsg: RawMessage = {
        LogType: 'App',
        Host: os.hostname(),
        AppName: conf.projectName,
        Instance: process.env.pm_id || '0',
        InputTimeStamp: this.getDateTimeLogFormat(new Date()),
        Level: lvlAppLog,
        Message: ''
      }

      let session
      if (_txt instanceof Array) {
        if (_txt.length > 1) {
          session = _txt.shift()
          if (_txt.length === 1) {
            this.printTxtJSON(rawMsg, _txt[0])
          } else {
            this.printTxtJSON(rawMsg, _txt)
          }
        } else {
          session = ''
          this.printTxtJSON(rawMsg, _txt[0])
        }
      } else {
        session = ''
        this.printTxtJSON(rawMsg, _txt)
      }
      rawMsg.Session = session
      return JSON.stringify(rawMsg)
    }
  }

  private getDateTimeLogFormat(date: Date): string {
    return dateFormat(date, dateFMT)
  }

  public debug(..._txt: any[]): void {
    if (!conf.log.console || conf.log.level === 'debug') return
    const str = this.processAppLog('debug', ..._txt)
    console.debug(str)
    if (this.logStream) this.logStream.write(str + endOfLine)
  }

  public info(..._txt: any[]): void {
    if (!conf.log.console || conf.log.level === 'info') return
    const str = this.processAppLog('info', ..._txt)
    console.info(str)
    if (this.logStream) this.logStream.write(str + endOfLine)
  }

  public warn(..._txt: any[]): void {
    if (!conf.log.console || conf.log.level === 'warn') return
    const str = this.processAppLog('warn', ..._txt)
    console.warn(str)
    if (this.logStream) this.logStream.write(str + endOfLine)
  }

  public error(..._txt: any[]): void {
    if (!conf.log.console || conf.log.level === 'error') return
    const str = this.processAppLog('error', ..._txt)
    console.error(str)
    if (this.logStream) this.logStream.write(str + endOfLine)
  }

  public ready(): boolean {
    return this.logStream !== null
  }

  public init(_conf?: Configuration, _express?: express.Express): Chira {
    this.logStream = true
    conf = _conf || conf

    if (conf.log) {
      this.logLevel = this.setLogLevel(conf.log.level)
      if (_express && this.logLevel === 0) {
        this.initLoggerMiddleware(_express)
      }
    }
  
    // ... (Initialize other streams)

    return this
  }

  private setLogLevel(logLevel: string) {
    if (logLevel === 'debug') {
      return 0
    } else if (logLevel === 'info') {
      return 1
    } else if (logLevel === 'warn') {
      return 2
    } else if (logLevel === 'error') {
      return 3
    } else {
      return 0
    }
  }

  private initLoggerMiddleware(_express: express.Express): void {
    _express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      req._reqTimeForLog = Date.now()
      const sid = typeof this.sessionID === 'function' ? this.sessionID(req, res) : undefined

      if (conf.log.format === 'pipe') {
        const txtLogReq = `INCOMING|__METHOD=${req.method.toLowerCase()} __URL=${req.url} __HEADERS=${JSON.stringify(
          req.headers
        )} __BODY=${this.toStr(req.body)}`
        if (sid) {
          this.debug(sid, txtLogReq)
        } else {
          this.debug(txtLogReq)
        }
      } else {
        const msg = {
          Type: 'INCOMING',
          Method: req.method.toLowerCase(),
          Url: req.url,
          Headers: req.headers,
          Body: req.body ? req.body : null,
        };
        if (sid) {
          this.debug(sid, msg)
        } else {
          this.debug(msg)
        }
      }

      onHeaders(res, () => {
        res._processAPP = Date.now() - req._reqTimeForLog
      })

      onFinished(res, (err, res) => {
        let txtLogRes
        if (conf.log.format === 'pipe') {
          txtLogRes = `OUTGOING|__STATUSCODE=${res.statusCode} __HEADERS=${JSON.stringify(
            res.getHeaders()
          )} __BODY=${this.toStr(res.body)} __PROCESSAPP=${res._processAPP} __RESTIME=${
            Date.now() - req._reqTimeForLog
          }`
        } else {
          txtLogRes = {
            Type: 'OUTGOING',
            StatusCode: res.statusCode,
            Headers: res.getHeaders(),
            Body: res.body,
            ProcessApp: res._processAPP,
            ResTime: Date.now() - req._reqTimeForLog,
          };
        }

        if (sid) {
          this.debug(sid, txtLogRes)
        } else {
          this.debug(txtLogRes)
        }
      })

      next()
    })

    if (conf.log.autoAddResBody !== false) {
      _express.use(logResponseBody)
    }
  }

  public close(cb?: (result: boolean) => void): void {
    if (this.logStream) this.logStream.end(cb)
    this.logStream = false
  }
}

export default Chira
