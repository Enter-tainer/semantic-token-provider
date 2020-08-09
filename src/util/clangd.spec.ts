import { startClangd, getHighlightData, parseHighlightData } from './clangd'

const f = async () => {
  const [l, c] = await startClangd(['-log=verbose'])
  console.log(l)
  const data = await getHighlightData(c, 'C:\\Users\\mgt\\Desktop\\project\\rehype-clangd-highlight\\test.cpp')
  const res = await parseHighlightData(l.tokenTypes, l.tokenModifiers, data)
  console.log(res)
}

f()
