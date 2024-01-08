import { IConfig } from "../types/config"

export const CONFIG: IConfig = {
  projectName: '',
  log: {
    time: 60,
    size: null,
    path: './appLog/',
    level: 'debug',
    console: true,
    file: true,
    autoAddResBody: true,
    format: 'json' // json, pipe
  },
  summary: {
    time: 60,
    size: null,
    path: './summaryLog/',
    console: true,
    file: true,
    format: 'json' // json, pipe
  },
  detail: {
    time: 15,
    size: null,
    path: './detailPath/',
    console: false,
    file: true,
    rawData: false,
    format: 'json'
  }
}