import Chira from '../index'

describe('Chira', () => {
  let chiraInstance: Chira

  beforeEach(() => {
    const chira = new Chira()
    chiraInstance = chira.init()
  })

  afterEach(() => {
    chiraInstance.close()
  })

  it('should be initialized with default configuration', () => {
    expect(chiraInstance.ready()).toBe(true)
  })

  it('should log debug message to console and stream', () => {
    const consoleDebugMock = jest.spyOn(console, 'debug').mockImplementation()
    chiraInstance.debug('Debug message')
    expect(consoleDebugMock).toHaveBeenCalledWith(expect.stringContaining('Debug message'))
  })

  it('should close the log stream', () => {
    const logStreamEndMock = jest.spyOn(chiraInstance, 'close').mockImplementation()
    chiraInstance.close()
    expect(logStreamEndMock).toHaveBeenCalled()
  })

})