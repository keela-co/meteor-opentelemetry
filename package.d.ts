type TraceableFunction<T> = (span: import('@opentelemetry/api').Span) => T
type TraceableAsyncFunction<T> = (span: import('@opentelemetry/api').Span) => Promise<T>;
type NotAsyncFunction<T> = T extends TraceableAsyncFunction<any> ? never : T;

declare module 'meteor/networksforchange:opentelemetry' {
  export function traceAsyncFunc<T extends TraceableAsyncFunction<R>, R>(spanName: string, func: T): ReturnType<T>;
  export function traceFunc<T extends TraceableFunction<R>, R>(spanName: string, func: NotAsyncFunction<T>): ReturnType<T>;
  export function tracedInterval<T>(func: (span: import('@opentelemetry/api').Span) => Promise<T>, delayMs: number): number;
  export function tracedTimeout<T>(func: (span: import('@opentelemetry/api').Span) => Promise<T>, delayMs: number): number;
}
