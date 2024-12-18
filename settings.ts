import { type Attributes } from "@opentelemetry/api";
import { Meteor } from "meteor/meteor";

export const settings: {
  traces?: { enabled?: boolean; otlpEndpoint?: string };
  metrics?: { enabled?: boolean; otlpEndpoint?: string };
  serverResourceAttributes?: Attributes;
  clientResourceAttributes?: Attributes;
  enhancedDbReporting?: boolean;
} = {
  ...(Meteor.settings.packages?.["networksforchange:opentelemetry"] ?? {}),
  ...(Meteor.settings.public?.["networksforchange:opentelemetry"] ?? {}),
  ...(Meteor.settings.private?.["networksforchange:opentelemetry"] ?? {}),
};
