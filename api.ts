import {
  type Span,
  SpanKind,
  context,
  trace,
} from "@opentelemetry/api";
import { Meteor } from "meteor/meteor";
import {settings} from "./settings";
import {SpanMock} from "./span-mock";

const tracer = trace.getTracer('async_func');

// @ts-ignore
export async function traceAsyncFunc<T extends TraceableAsyncFunction<R>, R>(spanName: string, func: T): ReturnType<T> {
  // enabled is only defined in the frontend. That's why we need to check if it's false explicitly.
  if(settings.enabled === false) {
    return await func(new SpanMock()) as ReturnType<T>;
  }
  const span = tracer.startSpan(spanName, {
    kind: SpanKind.INTERNAL,
  });
  try {
    const spanContext = trace.setSpan(context.active(), span);
    return await context.with(spanContext, () => func(span));
  } catch (err) {
    span.recordException(err as Error);
    throw err;
  } finally {
    span.end();
  }
}

export function traceFunc<T extends TraceableFunction<R>, R>(spanName: string, func: NotAsyncFunction<T>): ReturnType<T> {
  // enabled is only defined in the frontend. That's why we need to check if it's false explicitly.
  if(settings.enabled === false) {
    return func(new SpanMock()) as ReturnType<T>;
  }
  const span = tracer.startSpan(spanName, {
    kind: SpanKind.INTERNAL,
  });
  try {
    const spanContext = trace.setSpan(context.active(), span);
    return context.with(spanContext, () => func(span));
  } catch (err) {
    span.recordException(err as Error);
    throw err;
  } finally {
    span.end();
  }
}

export function tracedInterval<T>(func: (span: Span) => Promise<T>, delayMs: number) {
  const funcName = func.name || `${func.toString().slice(0, 50)}...` || '(anonymous)';
  return Meteor.setInterval(() => traceAsyncFunc(funcName, func), delayMs);
}

export function tracedTimeout<T>(func: (span: Span) => Promise<T>, delayMs: number) {
  const funcName = func.name || `${func.toString().slice(0, 50)}...` || '(anonymous)';
  return Meteor.setTimeout(() => traceAsyncFunc(funcName, func), delayMs);
}
