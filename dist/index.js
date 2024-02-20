"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const rfs = __importStar(require("rotating-file-stream"));
const mkdirp_1 = require("mkdirp");
const on_headers_1 = __importDefault(require("on-headers"));
const on_finished_1 = __importDefault(require("on-finished"));
const dateformat_1 = __importDefault(require("dateformat"));
const endOfLine = os_1.default.EOL;
process.env.pm_id = process.env.pm_id || '0';
const dateFMT = 'yyyymmdd HH:MM:ss.l';
const dateFMTSQL = 'yyyy-mm-dd HH:MM:ss.l';
const fileFMT = 'yyyymmddHHMMss';
const cTypeTXT = [
    'text/plain',
    'application/json',
    'text/xml',
    'text/html',
    'application/xml',
    'application/javascript',
    'text/css',
    'text/csv',
];
let conf = {
    projectName: 'PROJECT_NAME',
    log: {
        time: 15,
        size: null,
        path: './logs/appLog/',
        level: 'debug',
        console: true,
        file: true,
        autoAddResBody: true,
        format: 'json',
    },
};
class Chira {
    constructor() {
        this.logLevel = 0;
        this.logStream = null;
        this.streamTask = {
            app: [],
        };
    }
    getLogFileName(date, index) {
        return (conf.projectName +
            (date ? ('_' + (0, dateformat_1.default)(date, fileFMT)) : '') +
            (index ? '.' + index : '') +
            '.' +
            process.env.pm_id +
            '.log');
    }
    getConf(type) {
        if (type === 'app')
            return conf.log;
        return conf.log;
    }
    generator(type) {
        return (time, index) => {
            if (type === 'app')
                return this.getLogFileName(time, index);
            return this.getLogFileName(time, index);
        };
    }
    createOpts(conf) {
        const o = {
            path: conf.path,
        };
        if (conf.size)
            o.size = conf.size + 'K';
        if (conf.time)
            o.interval = conf.time + 'm';
        return o;
    }
    createStream(type) {
        const conf = this.getConf(type);
        const stream = rfs.createStream(this.generator(type), this.createOpts(conf));
        stream.on('error', function (err) {
            console.error(err);
        });
        return stream;
    }
    toStr(txt) {
        if (txt instanceof Error) {
            return txt.message + ', ' + txt.stack;
        }
        else if (txt instanceof Object) {
            return JSON.stringify(txt);
        }
        else {
            return txt;
        }
    }
    printTxtJSON(rawMsg, _txt) {
        if (_txt instanceof Error) {
            rawMsg.Message = _txt.message;
            rawMsg.Stack = _txt.stack;
        }
        else {
            rawMsg.Message = _txt;
        }
    }
    processAppLog(lvlAppLog, ..._txt) {
        if (conf.log.format === 'pipe') {
            let session;
            let txtMsg = '';
            if (_txt instanceof Array) {
                if (_txt.length > 1) {
                    session = _txt[0];
                    txtMsg = this.toStr(_txt[1]);
                    for (let i = 2; i < _txt.length; i++) {
                        txtMsg += ' ' + this.toStr(_txt[i]);
                    }
                }
                else {
                    session = '';
                    txtMsg = this.toStr(_txt[0]);
                }
            }
            else {
                session = '';
                txtMsg = this.toStr(_txt);
            }
            return `${this.getDateTimeLogFormat(new Date())}|${session}|${lvlAppLog}|${txtMsg}`;
        }
        else {
            const rawMsg = {
                LogType: 'App',
                Host: os_1.default.hostname(),
                AppName: conf.projectName,
                Instance: process.env.pm_id || '0',
                InputTimeStamp: this.getDateTimeLogFormat(new Date()),
                Level: lvlAppLog,
                Message: ''
            };
            let session;
            if (_txt instanceof Array) {
                if (_txt.length > 1) {
                    session = _txt.shift();
                    if (_txt.length === 1) {
                        this.printTxtJSON(rawMsg, _txt[0]);
                    }
                    else {
                        this.printTxtJSON(rawMsg, _txt);
                    }
                }
                else {
                    session = '';
                    this.printTxtJSON(rawMsg, _txt[0]);
                }
            }
            else {
                session = '';
                this.printTxtJSON(rawMsg, _txt);
            }
            rawMsg.Session = session;
            return JSON.stringify(rawMsg);
        }
    }
    getDateTimeLogFormat(date) {
        return (0, dateformat_1.default)(date, dateFMT);
    }
    writeLog(type, txt) {
        for (const stream of this.streamTask[type]) {
            if (stream.write) {
                stream.write(txt + endOfLine);
            }
        }
    }
    debug(..._txt) {
        if (this.logLevel > 0)
            return;
        const str = this.processAppLog('debug', ..._txt);
        if (conf.log.console)
            console.debug(str);
        if (conf.log.file)
            this.writeLog('app', str);
    }
    info(..._txt) {
        if (this.logLevel > 1)
            return;
        const str = this.processAppLog('info', ..._txt);
        if (conf.log.console)
            console.info(str);
        if (conf.log.file)
            this.writeLog('app', str);
    }
    warn(..._txt) {
        if (this.logLevel > 2)
            return;
        const str = this.processAppLog('warn', ..._txt);
        if (conf.log.console)
            console.warn(str);
        if (conf.log.file)
            this.writeLog('app', str);
    }
    error(..._txt) {
        if (this.logLevel > 3)
            return;
        const str = this.processAppLog('error', ..._txt);
        if (conf.log.console)
            console.error(str);
        if (conf.log.file)
            this.writeLog('app', str);
    }
    ready() {
        return this.logStream !== null;
    }
    init(_conf, _express) {
        this.logStream = true;
        conf = _conf || conf;
        if (conf.log) {
            this.logLevel = this.setLogLevel(conf.log.level);
            if (_express && this.logLevel === 0) {
                this.initLoggerMiddleware(_express);
            }
        }
        this.initializeLogger();
        process.stdin.resume();
        const exitHandler = (options) => {
            if (options.cleanup) {
                this.close();
            }
            if (options.exit) {
                process.exit();
            }
        };
        process.on('exit', exitHandler.bind(null, { cleanup: true }));
        process.on('SIGINT', exitHandler.bind(null, { exit: true }));
        process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
        process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
        process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
        return this;
    }
    initializeLogger() {
        if (conf.log) {
            if (conf.log.file) {
                if (!fs_1.default.existsSync(conf.log.path)) {
                    mkdirp_1.mkdirp.sync(conf.log.path);
                }
                this.streamTask.app.push(this.createStream('app'));
            }
            if (conf.log.console)
                this.streamTask.app.push(console);
        }
    }
    setLogLevel(logLevel) {
        if (logLevel === 'debug') {
            return 0;
        }
        else if (logLevel === 'info') {
            return 1;
        }
        else if (logLevel === 'warn') {
            return 2;
        }
        else if (logLevel === 'error') {
            return 3;
        }
        else {
            return 4;
        }
    }
    initLoggerMiddleware(_express) {
        _express.use((req, res, next) => {
            var _a;
            req._reqTimeForLog = Date.now();
            const sid = (_a = this.sessionIdProvider) === null || _a === void 0 ? void 0 : _a.call(this, req, res);
            if (conf.log.format === 'pipe') {
                const txtLogReq = `INCOMING|__METHOD=${req.method.toLowerCase()} __URL=${req.url} __HEADERS=${JSON.stringify(req.headers)} __BODY=${this.toStr(req.body)}`;
                if (sid) {
                    this.debug(sid, txtLogReq);
                }
                else {
                    this.debug(txtLogReq);
                }
            }
            else {
                const msg = {
                    Type: 'INCOMING',
                    Method: req.method.toLowerCase(),
                    Url: req.url,
                    Headers: req.headers,
                    Body: req.body ? req.body : null,
                };
                if (sid) {
                    this.debug(sid, msg);
                }
                else {
                    this.debug(msg);
                }
            }
            (0, on_headers_1.default)(res, () => {
                if (!req._reqTimeForLog)
                    req._reqTimeForLog = Date.now();
                res._processAPP = Date.now() - req._reqTimeForLog;
            });
            (0, on_finished_1.default)(res, (err, _res) => {
                let txtLogRes;
                if (!req._reqTimeForLog)
                    req._reqTimeForLog = Date.now();
                if (conf.log.format === 'pipe') {
                    txtLogRes = `OUTGOING|__STATUSCODE=${_res.statusCode} __HEADERS=${JSON.stringify(_res.getHeaders())} __BODY=${this.toStr(_res.body)} __PROCESSAPP=${_res._processAPP} __RESTIME=${Date.now() - req._reqTimeForLog}`;
                }
                else {
                    txtLogRes = {
                        Type: 'OUTGOING',
                        StatusCode: _res.statusCode,
                        Headers: _res.getHeaders(),
                        Body: _res.body,
                        ProcessApp: _res._processAPP,
                        ResTime: Date.now() - req._reqTimeForLog,
                    };
                }
                if (sid) {
                    this.debug(sid, txtLogRes);
                }
                else {
                    this.debug(txtLogRes);
                }
            });
            next();
        });
        if (conf.log.autoAddResBody) {
            _express.use(this.logResponseBody);
        }
    }
    logResponseBody(req, res, next) {
        try {
            const oldWrite = res.write;
            const oldEnd = res.end;
            const chunks = [];
            res.write = (...restArgs) => {
                chunks.push(Buffer.from(restArgs[0]));
                oldWrite.apply(res, restArgs);
            };
            res.end = ((...restArgs) => {
                if (restArgs[0]) {
                    chunks.push(Buffer.from(restArgs[0]));
                }
                let cType = res.getHeaders()['content-type'];
                let type = '';
                if (cType.includes(';')) {
                    cType = cType.split(';')[0];
                }
                if (cType === 'application/json') {
                    type = 'json';
                }
                else {
                    type = 'txt';
                }
                if (type) {
                    try {
                        if (type === 'json') {
                            res.body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : '';
                        }
                        else {
                            res.body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : '';
                        }
                    }
                    catch (error) {
                    }
                }
                oldEnd.apply(res, restArgs);
            }).bind(this);
            next();
        }
        catch (error) {
        }
    }
    setSessionId(provider) {
        this.sessionIdProvider = provider;
    }
    close(cb) {
        this.logStream = false;
    }
}
exports.default = Chira;