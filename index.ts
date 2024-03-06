import fs from 'fs'
import os from 'os'
import * as rfs from 'rotating-file-stream'
import { mkdirp } from 'mkdirp'
import onHeaders from 'on-headers'
import onFinished from 'on-finished'
import dateFormat from 'dateformat'
// import cron from 'node-cron'
import express from 'express'
import { AxiosResponse } from 'axios'

const endOfLine: string = os.EOL

process.env.pm_id = process.env.pm_id || '0'

const dateFMT: string = 'yyyymmdd HH:MM:ss.l'
// const dateFMT_SQL: string = 'yyyy-mm-dd HH:MM:ss.l'
const fileFMT: string = 'yyyymmddHHMMss'

// const cTypeTXT: string[] = [
//   'text/plain',
//   'application/json',
//   'text/xml',
//   'text/html',
//   'application/xml',
//   'application/javascript',
//   'text/css',
//   'text/csv',
// ]

interface AppLogConfiguration {
  time: number // m
  size: number | null // K
  path: string
  level: 'debug' | 'info' | 'warn' | 'error'
  console: boolean
  file: boolean
}

interface InfoLogConfiguration {
  time: number // m
  size: number | null // K
  path: string
  console: boolean
  file: boolean
}

interface ServiceLogConfiguration {
  time: number // m
  size: number | null // K
  path: string
  console: boolean
  file: boolean
}

type ConfigurationType = AppLogConfiguration | InfoLogConfiguration | ServiceLogConfiguration

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

type IResponse = Omit<express.Response, 'write'> & {
  write: (...data: any[]) => any
} | Omit<express.Response, 'end'> & {
  end: (...data: any[]) => any
}

export interface Configuration {
  projectName: string
  log: AppLogConfiguration
  info?: InfoLogConfiguration
  service?: ServiceLogConfiguration
}

let conf: Configuration = {
  projectName: 'PROJECT_NAME',
  log: {
    time: 15,
    size: null,
    path: './logs/appLog/',
    level: 'debug',
    console: true,
    file: true
  },
  info: {
    time: 15,
    size: null,
    path: './logs/infoLog/',
    console: false,
    file: false
  }
}

interface RawAppMessage {
  LOG_TYPE: string
  HOST: string
  APP_NAME: string
  INSTANCE: string
  INPUT_TIMESTAMP: string | null
  LEVEL: string
  SESSION_ID: string
  MESSAGE: string
  STACK?: string
}

interface RawInfoMessage {
  LOG_TYPE: string
  HOST: string
  APP_NAME: string
  INSTANCE: string
  INPUT_TIMESTAMP: string | null
  SESSION_ID: string
  REQUEST_METHOD: string
  REQUEST_URI: string
  REQUEST_HEADERS: any
  REQUEST_BODY: any
  RESPONSE_CODE: number
  RESPONSE_HEADERS: any
  RESPONSE_BODY: any
  RESPONSE_PROCESS: number
  STACK?: string
  RES_TIME: number
}

export type Logger = {
  debug: (...x: any[]) => void
  info: (...x: any[]) => void
  warn: (...x: any[]) => void
  error: (...x: any[]) => void
}

type RawInfoReq = {
  type: string
  method: string
  uri: string
  headers: any
  body: any
}

type RawInfoRes = {
  type: string
  statusCode: number
  headers: any
  body: any
  processApp: number
}

interface RawServiceMessage {
  LOG_TYPE: string
  SESSION_ID: string
  NODE_ENDPOINT: string
  HOST: string
  APP_NAME: string
  INSTANCE: string
  INPUT_TIMESTAMP: string | null
  REQUEST_METHOD: string
  REQUEST_URI: string
  REQUEST_HEADERS: any
  REQUEST_BODY: any
  RESPONSE_CODE: number
  RESPONSE_HEADERS: any
  RESPONSE_BODY: any
  RESPONSE_PROCESS: number
  STACK?: string
  RES_TIME: number
}

type RawServiceReq = {
  Type: string
  Method: string
  Url: string
  Headers: any
  Body: any
}

type RawServiceRes = {
  Type: string
  StatusCode: number
  Headers: any
  Body: any
  ProcessApp: number
}

export interface ServiceMessage {
  sid: string
  nodeName: string
  response: AxiosResponse
  processTime: number | null
  responseTime: number | null
}

interface StreamTask {
  [key: string]: any[]
}

// export type SessionIdProvider = ((req: express.Request, res: express.Response) => string | undefined) | undefined
interface SessionIdProvider {
  (req: express.Request, res: express.Response): string | undefined
}
class Chira {
  private logStream: any
  private logLevel: number = 0
  private streamTask: StreamTask
  private sessionIdProvider: SessionIdProvider = () => ''
  private sessionId: string = ''
  public logger: any

  constructor() {
    this.logStream = null
    this.streamTask = {
      app: [],
      info: [],
      service: []
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
    if (type === 'info' && conf.info) return conf.info
    if (type === 'service' && conf.service) return conf.service
    return conf.log
  }

  private generator(type: string): (time: Date, index: number | undefined) => string {
    return (time, index) => {
      if (type === 'app') return this.getLogFileName(time, index)
      if (type === 'info') return this.getLogFileName(time, index)
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

  private printTxtJSON(rawMsg: RawAppMessage, _txt: any): void {
    if (_txt instanceof Error) {
      rawMsg.MESSAGE = _txt.message
      rawMsg.STACK = _txt.stack
    } else {
      rawMsg.MESSAGE = _txt
    }
  }

  private processAppLog(lvlAppLog: string, ..._txt: any[]): string {
    const rawMsg: RawAppMessage = {
      LOG_TYPE: 'App',
      SESSION_ID: '',
      HOST: os.hostname(),
      APP_NAME: conf.projectName,
      INSTANCE: process.env.pm_id || '0',
      INPUT_TIMESTAMP: this.getDateTimeLogFormat(new Date()),
      LEVEL: lvlAppLog,
      MESSAGE: ''
    }

    let session
    if (_txt instanceof Array) {
      if (_txt.length > 1) {
        session = _txt.shift()
        this.printTxtJSON(rawMsg, _txt.join(', '))
      } else {
        session = ''
        this.printTxtJSON(rawMsg, _txt[0])
      }
    } else {
      session = ''
      this.printTxtJSON(rawMsg, _txt)
    }
    rawMsg.SESSION_ID = session
    return JSON.stringify(rawMsg)
  }

  private processInfoLog(session: string, reqLog: RawInfoReq, resLog: RawInfoRes, resTime: number): string {
    const rawMsg: RawInfoMessage = {
      LOG_TYPE: 'Info',
      SESSION_ID: session || '',
      HOST: os.hostname(),
      APP_NAME: conf.projectName,
      INSTANCE: process.env.pm_id || '0',
      INPUT_TIMESTAMP: this.getDateTimeLogFormat(new Date()),
      REQUEST_METHOD: reqLog.method,
      REQUEST_URI: reqLog.uri,
      REQUEST_HEADERS: reqLog.headers,
      REQUEST_BODY: reqLog.body,
      RESPONSE_CODE: resLog.statusCode,
      RESPONSE_HEADERS: resLog.headers,
      RESPONSE_BODY: resLog.body,
      RESPONSE_PROCESS: resLog.processApp,
      RES_TIME: resTime
    }

    return JSON.stringify(rawMsg)
  }

  private processServiceLog(serviceMessage: ServiceMessage): string {
    const rawMsg: RawServiceMessage = {
      LOG_TYPE: 'Service',
      SESSION_ID: serviceMessage.sid || '',
      NODE_ENDPOINT: serviceMessage.nodeName,
      HOST: os.hostname(),
      APP_NAME: conf.projectName,
      INSTANCE: process.env.pm_id || '0',
      INPUT_TIMESTAMP: this.getDateTimeLogFormat(new Date()),
      REQUEST_METHOD: serviceMessage.response.config.method || '',
      REQUEST_URI: serviceMessage.response.config.url || '',
      REQUEST_HEADERS: serviceMessage.response.config.headers,
      REQUEST_BODY: serviceMessage.response.config.data,
      RESPONSE_CODE: serviceMessage.response.status,
      RESPONSE_HEADERS: serviceMessage.response.headers,
      RESPONSE_BODY: serviceMessage.response.data,
      RESPONSE_PROCESS: serviceMessage.processTime || 0,
      RES_TIME: serviceMessage.responseTime || 0,
    }

    return JSON.stringify(rawMsg)
  }

  private getDateTimeLogFormat(date: Date): string {
    return dateFormat(date, dateFMT)
  }

  private writeLog(type: string, txt: string) {
    for (const stream of this.streamTask[type]) {
      if (stream.write) {
        stream.write(txt + endOfLine)
      }
    }
  }

  // ============ [START] write appLog ============
  private debug(..._txt: any[]): void {
    if (this.logLevel > 0) return
    const str = this.processAppLog('debug', ..._txt)
    if (conf.log.console) console.debug(str)
    if (conf.log.file) this.writeLog('app', str)
  }

  private info(..._txt: any[]): void {
    if (this.logLevel > 1) return
    const str = this.processAppLog('info', ..._txt)
    if (conf.log.console) console.info(str)
    if (conf.log.file) this.writeLog('app', str)
  }

  private warn(..._txt: any[]): void {
    if (this.logLevel > 2) return
    const str = this.processAppLog('warn', ..._txt)
    if (conf.log.console) console.warn(str)
    if (conf.log.file) this.writeLog('app', str)
  }

  private error(..._txt: any[]): void {
    if (this.logLevel > 3) return
    const str = this.processAppLog('error', ..._txt)
    if (conf.log.console) console.error(str)
    if (conf.log.file) this.writeLog('app', str)
  }
  // ============ [END] write appLog ============

  // ============ [START] write infoLog ============
  private infoLog(sid: string, reqLog: RawInfoReq, resLog: RawInfoRes, resTime: number): void {
    const str = this.processInfoLog(sid, reqLog, resLog, resTime)
    if (conf.info?.console) console.info(str)
    if (conf.info?.file) this.writeLog('info', str)
  }
  // ============ [END] write infoLog ============

  // ============ [START] write serverLog ============
  private serverLog(serviceMessage: ServiceMessage): void {
    const str = this.processServiceLog(serviceMessage)
    if (conf.service?.console) console.info(str)
    if (conf.service?.file) this.writeLog('service', str)
  }
  // ============ [END] write serverLog ============

  public ready(): boolean {
    return this.logStream !== null
  }

  public init(_conf?: Configuration, _express?: express.Express): Chira {
    this.logStream = true
    conf = _conf || conf
    this.logLevel = this.setLogLevel(conf.log.level)
    
    if (conf.info && _express) {
      this.initInfoLogger(_express)
    }
    
    // create logs dir
    this.initializeLogger()

    process.stdin.resume()
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

  public getLogger(sid?: string): Logger {
    const sessionId = sid || ''
    const logs = {
      debug: (...x: any[]) => this.debug(sessionId, ...x),
      info: (...x: any[]) => this.info(sessionId, ...x),
      warn: (...x: any[]) => this.warn(sessionId, ...x),
      error: (...x: any[]) => this.error(sessionId, ...x)
    }
    return logs
  }

  public getServiceLogger() {
    return {
      serviceLogger : (serviceMessage: ServiceMessage) => this.serverLog(serviceMessage)
    }
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
    if (conf.info) {
      if (conf.info.file) {
        if (!fs.existsSync(conf.info.path)) {
          mkdirp.sync(conf.info.path)
        }
        this.streamTask.info.push(this.createStream('info'))
      }
      if (conf.info.console) this.streamTask.info.push(console)
    }
    if (conf.service) {
      if (conf.service.file) {
        if (!fs.existsSync(conf.service.path)) {
          mkdirp.sync(conf.service.path)
        }
        this.streamTask.service.push(this.createStream('service'))
      }
      if (conf.service.console) this.streamTask.service.push(console)
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

  private initInfoLogger(_express: express.Express): void {
    _express.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      req._reqTimeForLog = Date.now()
      const sid = this.sessionIdProvider?.(req, res)
      req.sessionId = sid || ''
      const txtLogReq: RawInfoReq = {
        type: 'INCOMING',
        method: req.method,
        uri: req.url,
        headers: req.headers,
        body: req.body ? req.body : null,
      }

      onHeaders(res, () => {
        if (!req._reqTimeForLog) req._reqTimeForLog = Date.now()
        res._processAPP = Date.now() - req._reqTimeForLog
      })

      onFinished(res, (err: any, _res: express.Response) => {
        if (!req._reqTimeForLog) req._reqTimeForLog = Date.now()
        let txtLogRes: RawInfoRes = {
          type: 'OUTGOING',
          statusCode: _res.statusCode,
          headers: _res.getHeaders(),
          body: _res.body,
          processApp: _res._processAPP
        }
        const resTime = Date.now() - req._reqTimeForLog
        this.infoLog(sid || '', txtLogReq, txtLogRes, resTime)
      })

      next()
    })

    _express.use(this.logResponseBody as any)
  }

  private logResponseBody (req: express.Request, res: IResponse, next: express.NextFunction) {
    try {
      const oldWrite = res.write
      const oldEnd = res.end
      const chunks: Uint8Array[] | Buffer[] = []

      res.write = (...restArgs: [data: any[]] | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>[]) => {
        chunks.push(Buffer.from(restArgs[0] as any))
        oldWrite.apply(res, restArgs as any)
      }

      res.end = ((...restArgs: any[]) => {
        if (restArgs[0]) {
          chunks.push(Buffer.from(restArgs[0]))
        }

        let cType = res.getHeaders()['content-type'] as string
        let type = ''

        if (cType.includes(';')) {
          cType = cType.split(';')[0]
        }

        if (cType === 'application/json') {
          type = 'json'
        } else {
          type = 'txt'
        }

        if (type) {
          try {
            if (type === 'json') {
              res.body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : ''
            } else {
              res.body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : ''
            }
          } catch (error) {
          }
        }
        oldEnd.apply(res, restArgs)
      }).bind(this)
      next()
    } catch (error) {
    }
  }

  /**
   * This function, setSessionId, is a method that accepts a parameter provider of type SessionIdProvider. 
   * The SessionIdProvider is a type that can either be a function or undefined. If it’s a function, it takes two arguments: req and res, which are objects of types express.Request and express.Response respectively. The function returns a string or undefined.
   * @param {SessionIdProvider} callbackProvider - The provider function that generates a session ID or undefined.
   * 
   * @example
   * ```javascript
   * const sessionId = (req: Request, res: Response) => req.headers['request-id']
   * logger.setSessionId(sessionId)
   * ```
   */
  public setSessionId(callbackProvider: SessionIdProvider) {
    this.sessionIdProvider = callbackProvider
  }

  public close(cb?: (result: boolean) => void): void {
    // if (this.logStream) this.logStream.end(cb)
    this.logStream = false
    this.streamTask = {}
  }
}

export default Chira
