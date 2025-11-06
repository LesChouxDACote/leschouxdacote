// eslint-disable-next-line @typescript-eslint/ban-types
type ObjectKeys<T> = T extends object
  ? (keyof T)[]
  : T extends number
    ? []
    : T extends Array<any> | string
      ? string[]
      : never

// https://fettblog.eu/typescript-better-object-keys/
interface ObjectConstructor {
  keys<T>(o: T): ObjectKeys<T>
}

// https://github.com/microsoft/TypeScript/issues/24509
type Mutable<T extends Record<string, unknown>> = {
  -readonly [K in keyof T]: T[K]
}
