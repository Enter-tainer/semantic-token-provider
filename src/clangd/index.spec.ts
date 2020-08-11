import { getTokens } from '.'

const f = async () => {
  const data = await getTokens(['-log=verbose'], `c:\\Users\\mgt\\AppData\\Local\\Temp\\b33fde86.cpp`)
  data.map(({ tokens, line }) => console.log(line, tokens))
}

f()
