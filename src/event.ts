import { IComponentEvent } from "@src/interfaces";
import { EventEmitter, on } from "events";

export enum Event {
  active = "active",
  acquired = "acquired",
}

export class ComponentEvent implements IComponentEvent {
  emitter: EventEmitter;
  events: { [key: string]: boolean };

  constructor() {
    this.emitter = new EventEmitter();
    this.events = {
      [Event.active]: false,
      [Event.acquired]: false,
    };
  }

  emit(event: string, value: boolean): void {
    this.events[event] = value;
    this.emitter.emit(event, value);
  }

  async wait(event: string, desired: boolean): Promise<boolean> {
    if (this.events[event] === desired) return desired;
    for await (const [value] of on(this.emitter, event)) {
      if (desired === value) return value;
    }
  }
}
