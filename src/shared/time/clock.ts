/** The only source of time for the application, injected for testability. */
export interface Clock {
  now(): Date;
  /** IANA time zone configured on the device. */
  deviceTimeZone(): string;
}
