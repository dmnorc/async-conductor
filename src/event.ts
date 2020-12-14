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

  set(): void {
    this.value = true;
    this.emitter.emit(this.event, true);
  }

  clear(): void {
    this.value = false;
    this.emitter.emit(this.event, false);
  }

  async wait(isSet: boolean): Promise<void> {
    if (this.value === isSet) return;
    for await (const [value] of on(this.emitter, this.event)) {
      if (isSet === value) return;
    }
  }
}
