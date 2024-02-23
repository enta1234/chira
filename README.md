# How to use

This logger for express app and manage session id.

## Installation

 ```
  npm i github:enta1234/chira
 ```

## How to use

### 1. Use appLog

example

```ts
import Chira, { Configuration } from 'chira'

const tempConfig: Configuration = {
  projectName: 'project name',
  log: {
    time: 15, // Minute
    size: 5, // K
    path: './logs/middleware/appLogs',
    level: 'debug', // debug, info, warn, error
    console: true,
    file: true
  }
}

const chira = new Chira().init(tempConfig)
const logger = chira.getLogger() // empty is no sessionId

logger.debug('debug log')
logger.info('info log')
logger.warn('warn log')
logger.error('error log')
```

result

```
{"LogType":"App","Host":"","Session":"","AppName":"PROJECT_NAME","Instance":"0","InputTimeStamp":"","Level":"debug","Message":"Debug message"}
{"LogType":"App","Host":"","Session":"","AppName":"PROJECT_NAME","Instance":"0","InputTimeStamp":"","Level":"info","Message":"Info message"}
{"LogType":"App","Host":"","Session":"","AppName":"PROJECT_NAME","Instance":"0","InputTimeStamp":"","Level":"warn","Message":"Warn message"}
{"LogType":"App","Host":"","Session":"","AppName":"PROJECT_NAME","Instance":"0","InputTimeStamp":"","Level":"error","Message":"Error message"}
```

### 2. Use infoLogs

```ts
import Chira, { Configuration } from 'chira'
import Express from 'express'

const app = express()

const tempConfig: Configuration = {
  projectName: 'project name',
  log: {
    time: 15, // Minute
    size: 50, // Kb
    path: './logs/middleware/appLogs',
    level: 'debug', // debug, info, warn, error
    console: true,
    file: true
  },
  info: {
    time: 15, // Minute
    size: 50, // Kb
    path: './logs/middleware/infoLogs',
    console: true,
    file: true
  }
}

// callback function to get session id
const sessionId = (req: Request, res: Response) => req.headers['request-id'] ? req.headers['request-id'] as string : ''

// init chira log with using Express
const chira = new Chira().init(tempConfig, app)
const loggerNoSession = chira.getLogger()
chira.setSessionId(sessionId) // use callback function.

app.use('/', (req, res) => {
  // use same sessionId with infoLog
  const loggerWithSession = chira.getLogger(sessionId()) //use string
  loggerWithSession.debug('got request from client.')
  res.send('ok')
})

app.listen(3000, () => loggerNoSession.info('app started on PORT: 3000'))
```

result (appLog)
```ts
{"LogType":"App","Host":"","Session":"","AppName":"PROJECT_NAME","Instance":"0","InputTimeStamp":"","Level":"info","Message":"app started on PORT: 3000"}
{"LogType":"App","Host":"","Session":"","AppName":"PROJECT_NAME","Instance":"0","InputTimeStamp":"","Level":"debug","Message":"got request from client."}
```

result after response (infoLog)
```ts
{"LogType":"Info","Session":"request-id-01","Host":"","AppName":"middleware","Instance":"0","InputTimeStamp":"20240223 12:24:21.288","Request":{"Type":"INCOMING","Method":"POST","Url":"/","Headers":{"host":"127.0.0.1:49441","accept-encoding":"gzip, deflate","request-id":"request-id-01","content-type":"application/json","content-length":"17","connection":"close"},"Body":{"msg":"hello 4"}},"Response":{"Type":"OUTGOING","StatusCode":200,"Headers":{"x-powered-by":"Express","content-type":"text/html; charset=utf-8","content-length":"2","etag":"W/\"2-eoX0dku9ba8cNUXvu/DyeabcC+s\""},"Body":"ok","ProcessApp":74},"ResTime":75}
```

## Example for use in project

1. create `logger.ts` file

```ts
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
```

2. init with express app

```ts
import express from 'express'
import log from './logger'

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
log.initLog(app)

// other middleware here.
// app.use...
// app.use...

// init route here.
// app.get...
// app.post...

// http error handle here.
//...
export default app
```

3. Use in other `controller` file in `req` has `.sessionId` you can use it and can define again.

```ts
import { Request, Response } from 'express'
import log from './logger' // import 'logger.ts'

// without custom Request
export function getUser(req: Request, res: Response) {
  const sid = req.headers['request-id'] as string || ''
  const logger = log.getLogger(sid)

  logger.debug('......... i got you')

  res.json({})
}

// with custom Request
// have 2 option interface and type(Recommend)
// interface ICustomRequest extends Request { sessionId?: string}
type CustomRequestType = Request & { sessionId?: string }

export function getAdmin(req: CustomRequestType, res: Response) {
  const sid = req.sessionId || '' // in chira will pass from setSessionId()
  const logger = log.getLogger(sid)

  logger.debug('......... i got you')

  res.json({})
}
```