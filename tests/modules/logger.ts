import Chira, { Configuration } from '../../index'
import { Express, Request, Response } from 'express'

let chira: Chira
const tempConfig: Configuration = {
  projectName: 'middleware',
  log: {
    time: 1,
    size: 5,
    path: './logs/middleware/appLogs',
    level: 'debug',
    console: true,
    file: true
  },
  info: {
    time: 1,
    size: 5,
    path: './logs/middleware/infoLogs',
    console: true,
    file: true
  }
}

function initLog(app: Express) {
  chira = new Chira().init(tempConfig, app)
  const sessionId = (req: Request, res: Response) => req.headers['request-id'] ? req.headers['request-id'] as string : 'request-id'
  chira.setSessionId(sessionId)
}

function getLogger(sid: string) {
  const logger = chira.getLogger(sid)
  return logger
}

export default {
  initLog,
  getLogger
}
