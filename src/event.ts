import { IEvent } from "./interfaces";
import { EventEmitter, on } from "events";

export class Event implements IEvent {
  protected readonly emitter: EventEmitter;
  protected value: boolean;
  protected readonly event = "event";

  constructor(setDefault = false) {
    this.emitter = new EventEmitter();
    this.value = setDefault;
  }

  /**
   * Sets value to true
   */
  set(): void {
    this.value = true;
    this.emitter.emit(this.event, true);
  }

  /**
   * Sets value to false
   */
  clear(): void {
    this.value = false;
    this.emitter.emit(this.event, false);
  }

  /**
   * Wait for value
   */
  async wait(isSet: boolean): Promise<void> {
    if (this.value === isSet) return;
    for await (const [value] of on(this.emitter, this.event)) {
      if (isSet === value) return;
    }
  }

  /**
   * Gets current value state
   */
  get state(): boolean {
    return this.value;
  }
}
