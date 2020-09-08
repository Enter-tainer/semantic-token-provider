import * as cp from 'child_process'
import * as rpc from 'vscode-jsonrpc'
import * as fs from 'fs'
import { promisify } from 'util'
import { URI } from 'vscode-uri'

export type Clangd = rpc.MessageConnection
export async function startClangd(args: Array<string> = []): Promise<[any, Clangd]> {
  const clangd = cp.spawn('clangd', args, { windowsHide: false, detached: true })
  let connection = rpc.createMessageConnection(
    new rpc.StreamMessageReader(clangd.stdout),
    new rpc.StreamMessageWriter(clangd.stdin))
  connection.listen()
  // clangd.stderr.on('data', (data) => {
  //   console.error((data as Buffer).toString('utf-8'))
  // })
  const res = await connection.sendRequest('initialize', {
    processId: null,
    rootUri: null,
    trace: 'verbose',
    capabilities: {
      offsetEncoding: ["utf-8"],
      textDocument: {
        semanticTokens: {
          requests: {
            full: true
          },
          tokenTypes: [
            "namespace",
            "type",
            "class",
            "enum",
            "interface",
            "struct",
            "typeParameter",
            "parameter",
            "variable",
            "property",
            "enumMember",
            "event",
            "function",
            "member",
            "macro",
            "keyword",
            "modifier",
            "comment",
            "string",
            "number",
            "regexp",
            "operator"
          ],
          tokenModifiers: [
            "declaration",
            "definition",
            "readonly",
            "static",
            "deprecated",
            "abstract",
            "async",
            "modification",
            "documentation",
            "defaultLibrary"
          ],
          formats: ['relative']
        }
      }
    }
  })
  const legend = (res as any).capabilities.semanticTokensProvider.legend
  await connection.sendNotification('initialized')
  return [legend, connection]
}

async function readFileToString(path: string): Promise<string> {
  return promisify(fs.readFile)(path, 'utf-8')
}

export async function getHighlightData(clangd: Clangd, path: string): Promise<number[]> {
  const uri = URI.file(path)
  await clangd.sendNotification('textDocument/didOpen', {
    textDocument: {
      uri: uri.toString(),
      languageId: 'cpp',
      version: 0,
      text: await readFileToString(path)
    }
  })
  const res = await clangd.sendRequest('textDocument/semanticTokens/full', {
    textDocument: {
      uri: uri.toString()
    }
  })
  clangd.sendNotification('textDocument/didClose', {
    textDocument: {
      uri: uri.toString()
    }
  })
  return (res as any).data
}

interface HighlightData {
  line: number,
  startChar: number,
  length: number,
  tokenType: string,
  tokenModifiers: string[]
}

function HighlightDataFromArray(tokenTypes: string[], tokenModifiers: string[], data: number[]): HighlightData {
  const modifier: string[] = []
  for (let i = data[4]; i !== 0; i -= (i & -i)) {
    modifier.push(tokenModifiers[i & -i])
  }
  return {
    line: data[0],
    startChar: data[1],
    length: data[2],
    tokenType: tokenTypes[data[3]],
    tokenModifiers: modifier,
  }
}

export function parseHighlightData(tokenTypes: string[], tokenModifiers: string[], data: number[]): HighlightData[] {
  const resData: HighlightData[] = [HighlightDataFromArray(tokenTypes, tokenModifiers, data.slice(0, 5))]
  for (let i = 5; i < data.length; i += 5) {
    data[i] += data[i - 5]
    if (data[i] === data[i - 5]) {
      data[i + 1] += data[i - 4]
    }
    resData.push(HighlightDataFromArray(tokenTypes, tokenModifiers, data.slice(i, i + 5)))
  }
  return resData
}
