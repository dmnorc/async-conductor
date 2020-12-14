import { IComponentEvent } from "./interfaces";
import { EventEmitter, on } from "events";

export enum EventType {
  active = "active",
  acquired = "acquired",
}

export class Event implements IComponentEvent {
  emitter: EventEmitter;
  events: { [key: string]: boolean };

  constructor() {
    this.emitter = new EventEmitter();
    this.events = {
      [EventType.active]: false,
      [EventType.acquired]: false,
    };
  }

  emit(event: string, value: boolean): void {
    this.events[event] = value;
    this.emitter.emit(event, value);
  }

  async wait(event: string, desired: boolean): Promise<void> {
    if (this.events[event] === desired) return;
    for await (const [value] of on(this.emitter, event)) {
      if (desired === value) return;
    }
  }
}
