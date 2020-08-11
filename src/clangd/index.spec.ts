import { getTokens } from '.'

const f = async () => {
  const data = await getTokens(['-log=verbose'], 'C:\\Users\\mgt\\Desktop\\project\\rehype-clangd-highlight\\test.cpp')
  data.lines.map(({tokens, line}) => console.log(line, tokens))
}

f()
