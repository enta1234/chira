## Chira: Express Middleware Logger with Session Management

Chira is a lightweight Express middleware logger that simplifies logging and adds session management capabilities to your application.

### Installation

Install Chira using npm:

```bash
npm install github:enta1234/chira
```

## Usage

### Basic Logging:

1. Create a Chira instance and configure logging options:

```ts
import Chira, { Configuration } from 'chira'

const config: Configuration = {
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

const chira = new Chira().init(config)
```

2. Use getLogger() to create a logger instance:

```ts
const logger = chira.getLogger()

logger.debug('Debug message')
logger.info('Info message')
logger.warn('Warning message')
logger.error('Error message')
```

### Session-Based Logging:

1. Retrieve session ID from your request:

```ts
const sessionId = (req: Request, res: Response) =>  req.headers['request-id'] as string || ''
chira.setSessionId(sessionId)
```

### Advanced Configuration

Refer to the API reference for details on customizing logging levels, file paths, and rotation settings.

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

## Example Integration

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

### API Reference
- `new Chira().init(config?, app?: Express): Chira` - Creates a Chira instance and initializes it with configuration and optionally an Express app.
- `getLogger(sessionId?: string): ChiraLogger` - Retrieves a logger instance with the specified session ID (optional).
- `setSessionId(callback: (req: Request, res: Response))` - Set the session ID
