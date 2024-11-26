import { metrics } from '@opentelemetry/api';
import Fibers from 'fibers';
import {settings} from "../settings";
let StartTracked = Symbol('MontiStartTracked');

// Two instrumentations of fibers:
// 1. metrics about how fibers are doing
// 2. spans for fiber suspensions - commented out due to low value

let wrapped = false;

export function wrapFibers () {
  if (wrapped || !settings.metrics?.enabled) {
    return;
  }
  wrapped = true;

  // Let's report some metrics
  const metric = metrics.getMeter('meteor.fibers');

  // When metrics are gathered, give the latest tallies
  metric.createObservableCounter('meteor.fibers.num_created')
    .addCallback(x => x.observe(Fibers.fibersCreated));
  metric.createObservableGauge('meteor.fibers.pool_size')
    .addCallback(x => x.observe(Fibers.poolSize));

  // Also emit counters live in our hijacks
  const activeFibers = metric.createUpDownCounter('meteor.fibers.currently_active');
  const fiberInvokes = metric.createCounter('meteor.fibers.num_starts');
  const fiberYields = metric.createCounter('meteor.fibers.num_yields');

  let originalYield = Fibers.yield;
  Fibers.yield = function () {
    fiberYields.add(1);


    return originalYield();
  };

  let originalRun = Fibers.prototype.run;
  let originalThrowInto = Fibers.prototype.throwInto;

  function ensureFiberCounted (fiber: Fibers) {
    // If fiber.started is true, and StartTracked is false
    // then the fiber was probably initially ran before we wrapped Fibers.run
    if (!fiber.started || !fiber[StartTracked]) {
      activeFibers.add(1);
      fiberInvokes.add(1);
      fiber[StartTracked] = true;
    }
  }

  Fibers.prototype.run = function (val) {
    ensureFiberCounted(this);


    try {
      return originalRun.call(this, val);
    } finally {
      if (!this.started) {
        // This fiber has been returned to the cold pool
        activeFibers.add(-1);
        this[StartTracked] = false;
      }
    }
  };

  Fibers.prototype.throwInto = function (val) {
    ensureFiberCounted(this);
    try {
      return originalThrowInto.call(this, val);
    } finally {
      if (!this.started) {
        activeFibers.add(-1);
        this[StartTracked] = false;
      }
    }
  };
}
