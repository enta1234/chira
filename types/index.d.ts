declare namespace Express {
  export interface Request {
    _reqTimeForLog?: number
    _processAPP?: number
    sessionId?: string
  }
  export interface Response {
    _reqTimeForLog: number
    _processAPP: number
    body: any
    write: (args: any) => any
    end: (args: any) => any
  }
}