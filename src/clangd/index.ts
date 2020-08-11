import * as cp from 'child_process'
import * as rpc from 'vscode-jsonrpc'
import * as fs from 'fs/promises'
import { URI } from 'vscode-uri'

interface IToken {
  startIndex: number,
  endIndex: number,
  scopes: string[]
}

interface ITokenResult {
  tokens: IToken[],
  line: number
}

export function decodeTokens(tokens: string, scope: string[][]): IToken[] {
  const scopeMask = 0xFFFF;
  const lenShift = 0x10;
  const uint32Size = 4;
  const buf = Buffer.from(tokens, 'base64');
  const retTokens = [];
  for (let i = 0, end = buf.length / uint32Size; i < end; i += 2) {
    const start = buf.readUInt32BE(i * uint32Size);
    const lenKind = buf.readUInt32BE((i + 1) * uint32Size);
    const scopeIndex = lenKind & scopeMask;
    const len = lenKind >>> lenShift;
    retTokens.push({ startIndex: start, scopes: scope[scopeIndex], endIndex: len + start });
  }

  return retTokens;
}

export type Clangd = rpc.MessageConnection
export async function getTokens(args: Array<string> = [], path: string): Promise<ITokenResult[]> {
  const clangd = cp.spawn('clangd', args, { windowsHide: false, detached: true })
  let connection = rpc.createMessageConnection(
    new rpc.StreamMessageReader(clangd.stdout),
    new rpc.StreamMessageWriter(clangd.stdin))
  let notification = new rpc.NotificationType<string, void>('textDocument/semanticHighlighting')
  const p = new Promise((resolve, reject) => {
    connection.onNotification(notification, (param: any) => {
      //@ts-ignore
      param.lines = param.lines.map(({ tokens, ...data }) => ({ tokens: decodeTokens(tokens, scope), ...data }))
      resolve(param)
    })
  })
  connection.listen()
  // clangd.stderr.on('data', (data) => {
  //   console.error((data as Buffer).toString('utf-8'))
  // })
  const cap: any = await connection.sendRequest('initialize', {
    processId: null, rootUri: null, trace: 'verbose', capabilities: {
      textDocument: {
        semanticHighlightingCapabilities: {
          semanticHighlighting: true
        },
      }
    }
  })
  const scope = cap.capabilities.semanticHighlighting.scopes
  connection.sendNotification('initialized')
  const uri = URI.file(path)
  connection.sendNotification('textDocument/didOpen', {
    textDocument: {
      uri: uri.toString(),
      languageId: 'cpp',
      version: 0,
      text: await readFileToString(path)
    }
  })
  const res: { lines: ITokenResult[] } = (await p) as any
  connection.sendNotification('textDocument/didClose', {
    textDocument: {
      uri: uri.toString()
    }
  })
  clangd.kill()
  return res.lines
}

async function readFileToString(path: string): Promise<string> {
  return fs.readFile(path, 'utf-8')
}
