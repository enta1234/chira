import Chira, { Configuration } from '../index'
import express, { Request, Response } from 'express'
import request from 'supertest'

describe('Middleware', () => {
  let logger: Chira
  let app: express.Express = express()

  const tempConfig: Configuration = {
    projectName: 'middleware',
    log: {
      time: 1,
      size: 5,
      path: './logs/middleware/appLogs',
      level: 'debug',
      console: true,
      file: true,
      format: 'json'
    },
    info: {
      time: 1,
      size: 5,
      path: './logs/middleware/infoLogs',
      console: true,
      file: true,
      rawData: false
    }
  }

  const sessionId = (req: Request, res: Response) => req.headers['request-id'] ? req.headers['request-id'] as string : 'request-id'

  beforeEach(() => {
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    logger = new Chira().init(tempConfig, app)
    logger.setSessionId(sessionId)

    app.post('/', (req: Request, res: Response) => {
      // logger.debug('debug')
      logger.info('info')
      // logger.warn('warn')
      // logger.error('error')
      // throw new Error('mookoom moho mak mak.')
      res.status(400).json({ message: 'missing invalid' })
    })
  })

  afterEach(() => {
    logger.close()
  })

  it('should log response body when using logResponseBody middleware', async () => {
    const spyDebug = jest.spyOn(logger, 'debug')
    await request(app).post('/').send({ msg: 'hello' })

    expect(spyDebug).toHaveBeenCalledWith(expect.objectContaining({
        Type: 'INCOMING',
        Method: 'post',
        Url: '/',
        Body: { msg: 'hello' }
      }
    ))
    expect(spyDebug).toHaveBeenCalledWith(expect.objectContaining({
        Type: 'OUTGOING',
        StatusCode: 400,
        Body: { message: 'missing invalid' }
      }
    ))
  })
})
