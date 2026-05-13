export type Serialized<T> = T extends Date
  ? string
  : T extends (...args: never[]) => unknown
    ? never
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

export function serializeForClient<T>(obj: T): Serialized<T> {
  return JSON.parse(JSON.stringify(obj));
}
