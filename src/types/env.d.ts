declare module "*.svg" {
  const value: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export = value
}

declare module "standard-http-error/codes" {
  const value: Record<number, string>
  export = value
}

// https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform
interface NavigatorUAData {
  brands: string[]
  mobile: boolean
  platform: string
}
interface Navigator {
  userAgentData: NavigatorUAData
}
