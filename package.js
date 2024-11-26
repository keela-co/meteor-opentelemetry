Package.describe({
  name: 'networksforchange:opentelemetry',
  version: '0.8.0',
  summary: 'Meteor instrumentations for OpenTelemetry tracing',
  git: 'https://github.com/keela-co/meteor-opentelemetry',
  documentation: 'README.md',
});

Npm.depends({

  // This needs to be a sort of peer dependency
  // TODO: consider https://github.com/Meteor-Community-Packages/check-npm-versions
  // '@opentelemetry/api': '1.9.0',

  '@opentelemetry/sdk-trace-node': '1.25.0',
  '@opentelemetry/sdk-trace-web': '1.25.0',
  '@opentelemetry/semantic-conventions': '1.25.0',

  '@opentelemetry/otlp-transformer': '0.52.0',
  '@opentelemetry/exporter-trace-otlp-http': '0.52.0',
  '@opentelemetry/exporter-metrics-otlp-http': '0.52.0',

});

Package.onUse(function(api) {
  api.versionsFrom('2.13');
  api.use('ecmascript');
  api.use('typescript');
  api.use('zodern:types@1.0.9');
  api.use('montiapm:meteorx@2.2.0');
  api.export('resource');
  api.export('tracer');
  api.mainModule('opentelemetry-client.js', 'client');
  api.mainModule('opentelemetry-server.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('networksforchange:opentelemetry');
  api.mainModule('opentelemetry-tests.js');
});
