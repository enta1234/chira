const conf = {}
conf.projectName = 'PROJECT_NAME'

// Enable appLog
conf.log = {}
conf.log.time = 15 // Minute
conf.log.size = null // maxsize per file, K
conf.log.path = './log/appLogPath/' // path file
conf.log.level = 'debug' // debug,info,warn,error
conf.log.console = true
conf.log.file = true
conf.log.autoAddResBody = true // default  true
conf.log.format = 'pipe'

// Enable summaryLog
conf.summary = {}
conf.summary.time = 15
conf.summary.size = null // maxsize per file, K
conf.summary.path = './log/summaryPath/'
conf.summary.console = true
conf.summary.file = true
conf.summary.stream = true
conf.summary.format = 'pipe'

// Enable detail
conf.detail = {}
conf.detail.time = 15
conf.detail.size = null // maxsize per file, K
conf.detail.path = './log/detailPath/'
conf.detail.console = true
conf.detail.file = true
conf.detail.stream = true
conf.detail.rawData = false // true == show raw data

const express = require('express')
const http = require('http');
const app = express()
app.listen(3000)
// let logg = require('commonlog-kb').init(conf, app);
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
const logg = require('../dist/index').init(conf, app)

app.get('/x', function (req, res) {
  // req.body1={
  //   x:'s'
  // }
  // res.body = {x:'a'}
  // res.send('id: 1');
  const path = require('path')
  // res.sendFile(path.join(__dirname, './public', 'logoAIS.png'));
  res.json({ x: 'x' })
  // res.send({x:'x'})
  //   res.header('content-tYpe', "text/plain");
  //   res.write('<html>');
  // res.write('<body>');
  // res.write('<h1>Hello, World!</h1>');
  // res.write('</body>');
  // res.write('</html>');
  // res.end();
})

logg.sessionID = (req, res) => {
  return 'how to find session'
}
const alreadyInit = logg.ready()


logg.debug('without session')
logg.debug('session', 'text to log')
logg.debug('session', { foo: 'bar' }, ['foo', 'bar'])
logg.debug('xxxxxxxxxxxx', 'msg', new Error('xx'))
logg.debug('xxxxxxxxxxxx', 'ok', 'xx', 'b')
logg.debug(new Error('xx1'))

logg.info('without session')
logg.info('session', 'text to log')
logg.info('session', { foo: 'bar' }, ['foo', 'bar'])

logg.warn('without session')
logg.warn('session', 'text to log')
logg.warn('session', { foo: 'bar' }, ['foo', 'bar'])

logg.error('without session')
logg.error('session', 'text to log')
logg.error('session', { foo: 'bar' }, ['foo', 'bar'])

http.request({host: '0.0.0.0',path: '/',port: '3000',}).end()
