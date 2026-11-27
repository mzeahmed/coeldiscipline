import type { Clock } from './clock';
import { deviceTimeZone } from './dateInTimeZone';

export const systemClock: Clock = {
  now: () => new Date(),
  deviceTimeZone,
};
