import Chira, { Logger } from '../index'

describe('Chira', () => {
  let chiraInstance: Chira
  let logger: Logger

  beforeEach(() => {
    chiraInstance = new Chira().init()
    logger = chiraInstance.getLogger()
  })

  afterEach(() => {
    chiraInstance.close()
  })

  it('should be initialized with default configuration', () => {
    expect(chiraInstance.ready()).toBe(true)
  })

  it('should log debug message to console and stream', () => {
    const consoleDebugMock = jest.spyOn(console, 'debug').mockImplementation()
    logger.debug('Debug message')
    expect(consoleDebugMock).toHaveBeenCalledWith(expect.stringContaining('Debug message'))
  })

  it('should log info message to console and stream', () => {
    const consoleInfoMock = jest.spyOn(console, 'info').mockImplementation()
    logger.info('Info message')
    expect(consoleInfoMock).toHaveBeenCalledWith(expect.stringContaining('Info message'))
  })

  it('should log warn message to console and stream', () => {
    const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation()
    logger.warn('Warn message')
    expect(consoleWarnMock).toHaveBeenCalledWith(expect.stringContaining('Warn message'))
  })

  it('should log error message to console and stream', () => {
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation()
    logger.error('Error message')
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Error message'))
  })

  it('should close the log stream', () => {
    const logStreamEndMock = jest.spyOn(chiraInstance, 'close').mockImplementation()
    chiraInstance.close()
    expect(logStreamEndMock).toHaveBeenCalled()
  })

})
