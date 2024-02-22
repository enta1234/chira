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

    // app.use((req, __, next) => {
    //   req.logger.debug = (...txt) => {
    //     logger.debug(app.sid ,...txt)
    //   }

    //   next()
    // })

    app.post('/', (req: Request, res: Response) => {
      // logger.debug('debug')
      // logger.info('info')
      logger.debug('ssss', 'warn')
      // logger.error('error')
      // throw new Error('mookoom moho mak mak.')
      res.status(400).json({ message: 'missing invalid' })
    })
  })

  afterEach(() => {
    logger.close()
  })

  it('should log response body when using logResponseBody middleware', async () => {
    // const spyDebug = jest.spyOn(console, 'info')
    // const spyWard = jest.spyOn(logger, 'warn')

    // await request(app).post('/').set('request-id', 'request-id-1').send({ msg: 'hello 1' })
    // await request(app).post('/').set('request-id', 'request-id-2').send({ msg: 'hello 2' })
    // await request(app).post('/').set('request-id', 'request-id-3').send({ msg: 'hello 3' })
    // await request(app).post('/').set('request-id', 'request-id-4').send({ msg: 'hello 4' })

    await Promise.all([
      request(app).post('/').set('request-id', 'request-id-1').send({ msg: 'hello 1' }),
      request(app).post('/').set('request-id', 'request-id-2').send({ msg: 'hello 2' }),
      request(app).post('/').set('request-id', 'request-id-3').send({ msg: 'hello 3' }),
      request(app).post('/').set('request-id', 'request-id-4').send({ msg: 'hello 4' })
    ])
    // const strExpect = '{LogType:"Info",Session:"request-id",Request:{Type:"INCOMING",Method:"POST",Url:"/"},Response:{Type:"OUTGOING",StatusCode:400}}'

    // expect(spyWard).toHaveBeenCalledWith(expect.objectContaining({
    //   "Message":"warn",
    //   "Session":"request-id"
    // }))
    // expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining(strExpect))
  })
})
