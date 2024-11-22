import { Meteor } from "meteor/meteor";
import { type Attributes } from "@opentelemetry/api";

export const settings: {
    clientResourceAttributes?: Attributes;
} = {
    ...(Meteor.settings.public?.["networksforchange:opentelemetry"] ?? {}),
};
