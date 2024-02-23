import express, { Request, Response } from 'express'
import log from './modules/logger'
import request from 'supertest'
import { testLogger } from './controllers/simple'

describe('Middleware', () => {
  let app: express.Express = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  log.initLog(app)

  beforeEach(() => {
    app.post('/', testLogger)
  })

  afterEach(() => {
    // logger.close()
  })

  it('should log response body when using logResponseBody middleware', async () => {
    // const spyDebug = jest.spyOn(console, 'info')
    // const spyWard = jest.spyOn(logger, 'warn')
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
