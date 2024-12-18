import {Meteor} from "meteor/meteor";
import {check} from "meteor/check";

import {Resource} from '@opentelemetry/resources';
import {
    IExportTraceServiceRequest,
    IExportMetricsServiceRequest,
    IKeyValue,
    IResource,
} from '@opentelemetry/otlp-transformer';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {OTLPMetricExporter} from '@opentelemetry/exporter-metrics-otlp-http';
import {sendWithHttp} from '@opentelemetry/otlp-exporter-base';

import {settings} from "./settings";

export function getClientIp(connection?: Meteor.Connection) {
    if(!connection) {
        return;
    }

    const cloudFlareIp = connection.httpHeaders['cf-connecting-ip'];
    if (cloudFlareIp) {
        return cloudFlareIp;
    }

    const xOriginalForwardedFor = connection.httpHeaders['x-original-forwarded-for'];
    if (xOriginalForwardedFor) {
        return xOriginalForwardedFor;
    }

    /* This requires us to add the following headers to the nginx config map in each cluster:
     *
     * x-real-ip: $http_CF_Connecting_IP
     *
     * This is a workaround for the fact that the CF-Connecting-IP header is not present when a meteor method is called
     * and it is manually injected by the ingress controller.
     */
    const xRealIp = connection.httpHeaders['x-real-ip'];
    if (xRealIp && xRealIp.length > 1) {
        return xRealIp.replace(/ /g, '').split(',').pop();
    }

    const ipFromHeader = connection.httpHeaders['x-forwarded-for']?.split(',')[0];

    const ip = ipFromHeader ?? connection.clientAddress;

    return ip.split(':')[0];
}

if (settings.traces?.enabled || settings.metrics?.enabled) {
    // These are really only used for their URL, because we receive pre-transformed payloads
    const tracesExporter = settings.traces?.enabled ? new OTLPTraceExporter({
        url: settings.traces?.otlpEndpoint ? `${settings.traces.otlpEndpoint}/v1/traces` : void 0,
    }) : null;
    const metricsExporter = settings.metrics?.enabled ? new OTLPMetricExporter({
        url: settings.metrics?.otlpEndpoint ? `${settings.metrics.otlpEndpoint}/v1/metrics` : void 0,
    }) : null;

    const clientResources = new Resource(settings.clientResourceAttributes ?? {});
    clientResources.attributes['service.name'] ??= `unknown_service-browser`;
    const clientAttributeList = Object.entries(clientResources.attributes).map<IKeyValue>(x => ({
        key: x[0],
        value: {stringValue: `${x[1]}`},
    }));

    function mergeResourceAttributeArrays(a: IKeyValue[], b: IKeyValue[]): IKeyValue[] {
        const aKeys = a.map(x => x.key)
        const result = a.slice();
        for (const bEntry of b) {
            if (!aKeys.includes(bEntry.key)) {
                result.push(bEntry);
            }
        }
        return result;
    }

    function mangleResource(x: { resource?: IResource }) {
        x.resource ??= {attributes: [], droppedAttributesCount: 0};
        x.resource.attributes = [
            {key: 'session.public_ip', value: {stringValue: getClientIp(this.connection)}},
            ...mergeResourceAttributeArrays(x.resource.attributes, clientAttributeList),
        ];
    }

    Meteor.methods({
        async 'OTLP/v1/traces'(payload: IExportTraceServiceRequest) {
            check(payload, {
                resourceSpans: Array,
            });
            if (!tracesExporter) {
                return;
            }
            payload.resourceSpans?.forEach(mangleResource.bind(this));
            await new Promise<void>((ok, fail) =>
                sendWithHttp(tracesExporter, JSON.stringify(payload), 'application/json', ok, fail));
        },

        async 'OTLP/v1/metrics'(payload: IExportMetricsServiceRequest) {
            check(payload, {
                resourceMetrics: Array,
            });
            if (!metricsExporter) {
                return;
            }
            payload.resourceMetrics?.forEach(mangleResource.bind(this));
            await new Promise<void>((ok, fail) =>
                sendWithHttp(metricsExporter._otlpExporter, JSON.stringify(payload), 'application/json', ok, fail));
        },

        async 'OTLP/v1/logs'(payload: IExportMetricsServiceRequest) {
            // TODO: blocked on https://github.com/open-telemetry/opentelemetry-js/pull/3764
        },

    });

} else {
    // If we aren't set up for telemetry then we just drop any OTLP we receive
    Meteor.methods({
        'OTLP/v1/traces'() {
        },
        'OTLP/v1/metrics'() {
        },
        'OTLP/v1/logs'() {
        },
    });
}
