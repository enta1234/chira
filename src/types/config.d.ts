export type IConfig = {
  projectName: string
  log: {
    level: ILevel
    autoAddResBody: boolean,
  } & ILog
  summary: {} & ILog
  detail: {
    rawData: boolean
  } & ILog
}

export type ILog = {
  time: number
  size: number | null
  path: string
  console: boolean
  file: boolean
  format: IFormat
}

type ILevel = 'debug' | 'info' | 'warn' | 'error'
type IFormat = 'json' | 'pipe'