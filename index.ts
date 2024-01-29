import fs from 'fs'
import os from 'os'
import * as rfs from 'rotating-file-stream'
import { mkdirp } from 'mkdirp'
import onHeaders from 'on-headers'
import onFinished from 'on-finished'
import dateFormat from 'dateformat'
import cron from 'node-cron'
import express from 'express'

const endOfLine: string = os.EOL

process.env.pm_id = process.env.pm_id || '0'

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

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

type IResponse = Omit<express.Response, 'write'> & {
  write: (...data: any[]) => any
} | Omit<express.Response, 'end'> & {
  end: (...data: any[]) => any
}

export interface Configuration {
  projectName: string
  log: LogConfiguration
  // summary: SummaryConfiguration
  // detail: DetailConfiguration
}

let conf: Configuration = {
  projectName: 'PROJECT_NAME',
  log: {
    time: 15,
    size: null,
    path: './logs/appLog/',
    level: 'debug',
    console: true,
    file: true,
    autoAddResBody: true,
    format: 'json',
  },
  // summary: {
  //   time: 15,
  //   size: null,
  //   path: './logs/summary/',
  //   console: false,
  //   file: true,
  //   format: 'json',
  // },
  // detail: {
  //   time: 15,
  //   size: null,
  //   path: './logs/detail/',
  //   console: false,
  //   file: true,
  //   rawData: false
  // }
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
  [key: string]: any[]
}

class Chira {
  private logStream: any
  private logLevel: number = 0
  private streamTask: StreamTask
  private sessionIdProvider: ((req: any, res: any) => string | undefined) | undefined

  constructor() {
    this.logStream = null
    this.streamTask = {
      app: [],
      // smr: [],
      // dtl: []
    }
  }

  private getLogFileName(date: Date, index: number | undefined): string {
    return (
      conf.projectName +
      (date ? ('_' + dateFormat(date, fileFMT)) : '') +
      (index ? '.' + index : '') +
      '.' +
      process.env.pm_id +
      '.log'
    )
  }

  private getConf(type: string): ConfigurationType {
    if (type === 'app') return conf.log
    return conf.log
  }

  private generator(type: string): (time: Date, index: number | undefined) => string {
    return (time, index) => {
      if (type === 'app') return this.getLogFileName(time, index)
      return this.getLogFileName(time, index)
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

  private writeLog(type: string, txt: string) {
    for (const stream of this.streamTask[type]) {
      if (!stream.write) {
        stream.log(txt)
      } else {
        stream.write(txt + endOfLine)
      }
    }
  }

  public debug(..._txt: any[]): void {
    if (this.logLevel > 0) return
    const str = this.processAppLog('debug', ..._txt)
    console.debug(str)
    this.writeLog('app', str)
  }

  public info(..._txt: any[]): void {
    if (this.logLevel > 1) return
    const str = this.processAppLog('info', ..._txt)
    console.info(str)
    this.writeLog('app', str)
  }

  public warn(..._txt: any[]): void {
    if (this.logLevel > 2) return
    const str = this.processAppLog('warn', ..._txt)
    console.warn(str)
    this.writeLog('app', str)
  }

  public error(..._txt: any[]): void {
    if (this.logLevel > 3) return
    const str = this.processAppLog('error', ..._txt)
    console.error(str)
    this.writeLog('app', str)
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

    this.initializeLogger()

    process.stdin.resume()// so the program will not close instantly
    const exitHandler = (options: {[key: string]: boolean}) => {
      if (options.cleanup) {
        this.close()
      }
      if (options.exit) {
        process.exit()
      }
    }
    // do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }))
    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }))
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
    // catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }))

    return this
  }

  private initializeLogger() {
    if (conf.log) {
      if (conf.log.file) {
        if (!fs.existsSync(conf.log.path)) {
          mkdirp.sync(conf.log.path)
        }
        this.streamTask.app.push(this.createStream('app'))
      }
      if (conf.log.console) this.streamTask.app.push(console)
    }
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
      return 4
    }
  }

  private initLoggerMiddleware(_express: express.Express): void {
    _express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      req._reqTimeForLog = Date.now()
      const sid = this.sessionIdProvider?.(req, res)

      if (conf.log.format === 'pipe') {
        const txtLogReq = 
          `INCOMING|__METHOD=${req.method.toLowerCase()} __URL=${req.url} __HEADERS=${JSON.stringify(req.headers)} __BODY=${this.toStr(req.body)}`
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
        if (!req._reqTimeForLog) req._reqTimeForLog = Date.now()
        res._processAPP = Date.now() - req._reqTimeForLog
      })

      onFinished(res, (err, _res) => {
        let txtLogRes
        console.log('res.body: ', _res.body)
        console.log('res.body: ', res.body)
        if (!req._reqTimeForLog) req._reqTimeForLog = Date.now()
        if (conf.log.format === 'pipe') {
          txtLogRes = `OUTGOING|__STATUSCODE=${res.statusCode} __HEADERS=${JSON.stringify(
            _res.getHeaders()
          )} __BODY=${this.toStr(_res.body)} __PROCESSAPP=${_res._processAPP} __RESTIME=${
            Date.now() - req._reqTimeForLog
          }`
        } else {
          txtLogRes = {
            Type: 'OUTGOING',
            StatusCode: _res.statusCode,
            Headers: _res.getHeaders(),
            Body: _res.body,
            ProcessApp: _res._processAPP,
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

    if (conf.log.autoAddResBody) {
      _express.use(this.logResponseBody as any)
    }
  }

  private logResponseBody (req: express.Request, res: IResponse, next: express.NextFunction) {
    const oldWrite = res.write
    const oldEnd = res.end
    const chunks: Uint8Array[] | Buffer[] = []

    const checkCType = this.checkCType
  
    res.write = (...restArgs: [data: any[]] | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>[]) => {
      chunks.push(Buffer.from(restArgs[0] as any))
      oldWrite.apply(res, restArgs as any)
    }
  
    res.end = (...restArgs: any[]) => {
      if (restArgs[0]) {
        chunks.push(Buffer.from(restArgs[0]))
      }
      const cType = checkCType(res.getHeaders()['content-type'] as string)
      if (cType !== false) {
        try {
          if (cType === 'json') {
            res.body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : ''
          } else {
            res.body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : ''
          }
        } catch (error) {
          console.error(error)
        }
      }
      oldEnd.apply(res, restArgs)
    }
    next()
  }

  private checkCType (cType: string) {
    if (cType) {
      if (cType.includes(';')) {
        cType = cType.split(';')[0]
      }
      if ((cType) === 'application/json') {
        return 'json'
      }
      if (cTypeTXT.includes(cType)) {
        return 'txt'
      }
    }
    return false
  }

  public setSessionId(provider: (req: any, res: any) => string | undefined) {
    this.sessionIdProvider = provider
  }

  public close(cb?: (result: boolean) => void): void {
    // if (this.logStream) this.logStream.end(cb)
    this.logStream = false
  }
}

export default Chira
