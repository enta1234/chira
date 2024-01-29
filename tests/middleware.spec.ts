import Chira, { Configuration } from '../index'
import express, { Request, Response } from 'express'
import request from 'supertest'


describe('Middleware', () => {
  let logger: Chira
  let app: express.Express = express()

  const tempConfig: Configuration = {
    projectName: 'Jest',
    log: {
      time: 15,
      size: null,
      path: './logs/middleware',
      level: 'debug',
      console: true,
      file: false,
      autoAddResBody: false,
      format: 'json'
    }
  }

  beforeEach(() => {
    app.use(express.json())

    logger = new Chira().init(tempConfig, app)

    app.post('/', (req: Request, res: Response) => {
      res.json({ message: 'Hello, world!' })
    })
  })

  afterEach(() => {
    logger.close()
  })

  it('should log response body when using logResponseBody middleware', async () => {
    const spyDebug = jest.spyOn(logger, 'debug')

    await request(app).post('/').send({msg: 'hello'})

    expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('INCOMING'))
    // expect(spyDebug).toHaveBeenCalledWith(expect.stringContaining('OUTGOING'))
  })

})
