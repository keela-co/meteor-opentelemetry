import { diag, DiagConsoleLogger, DiagLogLevel, metrics } from "@opentelemetry/api";
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

import { MeteorContextManager } from "./server/context-manager";
import { settings } from "./settings";

import { wrapFibers } from './instrument/fibers'
import './instrument/ddp-server'
import './instrument/webapp'
import './instrument/mongodb'

if (settings.traces?.enabled || settings.metrics?.enabled) {
  const resource = new Resource(settings.serverResourceAttributes ?? {});

  if (settings.metrics?.enabled) {
    const metricsProvider = new MeterProvider({
      resource,
    });
    metricsProvider.addMetricReader(new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: settings.metrics?.otlpEndpoint ? `${settings.metrics.otlpEndpoint}/v1/metrics` : undefined,
      }),
      exportIntervalMillis: 20_000,
    }));
    metrics.setGlobalMeterProvider(metricsProvider);
  }
  if (settings.traces?.enabled) {
    const provider = new NodeTracerProvider({
      resource,
    });
    provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter({
      url: settings.traces?.otlpEndpoint ? `${settings.traces.otlpEndpoint}/v1/traces` : undefined,
    })));
    // this also sets the global trace provider:
    provider.register({
      contextManager: new MeteorContextManager().enable(),
    });
  }
  wrapFibers(); // apparently needs to happen after the metrics provider is set up
}
