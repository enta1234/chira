import express from 'express'
import log from './modules/logger'
import { testLogger } from './controllers/simple'
import axios from 'axios'

describe('Middleware', () => {
  let app: express.Express = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  log.initLog(app)

  beforeEach(() => {
    app.post('/', testLogger)

    // axios.interceptors.response.use()
  })

  afterEach(() => {
    // logger.close()
  })

  it('check Interception GET method on Axios', async () => {
    axios.get('/')
  })
})
