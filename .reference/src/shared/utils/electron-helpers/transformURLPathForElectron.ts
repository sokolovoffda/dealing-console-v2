export const transformURLPathForElectron = (url: string, replacePath: string) => {
  const [prePath, _] = url.split('/dist')
  return `${prePath}/dist/${replacePath}`
}