import type { Span, SpanContext, SpanStatus, Link, TimeInput, Exception, SpanAttributes, SpanAttributeValue} from '@opentelemetry/api';

export class SpanMock implements Span {
    addEvent(): this {
        return this;
    }

    addLink(link: Link): this {
        return this;
    }

    addLinks(links: Link[]): this {
        return this;
    }

    end(endTime?: TimeInput): void {
    }

    isRecording(): boolean {
        return false;
    }

    recordException(exception: Exception, time?: TimeInput): void {
    }

    setAttribute(key: string, value: SpanAttributeValue): this {
        return this;
    }

    setAttributes(attributes: SpanAttributes): this {
        return this;
    }

    setStatus(status: SpanStatus): this {
        return this;
    }

    spanContext(): SpanContext {
        return undefined;
    }

    updateName(name: string): this {
        return this;
    }
}
