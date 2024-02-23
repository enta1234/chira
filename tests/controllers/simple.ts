// import { Request, Response } from "supertest";
import { Request, Response } from "express";
import log from '../modules/logger'

interface CustomRequest extends Request {
  sessionId?: string
}

export function testLogger(req: CustomRequest, res: Response) {
  const sid = req?.sessionId || ''
  const logger = log.getLogger(sid)
  try {
    logger.debug('debug', 'debug debug debug debug', 'debug debug debug')
    logger.info('info', [[{}]])
    logger.warn('warn', 'debug', [[{}]], {}, 5)
    throw new Error('chunn error.')
  } catch (error) {
    logger.error('debug', error)
  }
  res.send('ok')
}
