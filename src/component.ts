import { EventEmitter, on } from "events";
import { Constructor, IComponent, IComponentEvent } from "./interfaces";

enum Event {
  active = "active",
  acquired = "acquired",
}

class ComponentEvent implements IComponentEvent {
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

export abstract class Component implements IComponent {
  dependencies: Constructor<IComponent>[] = [];
  protected requiredBy: Set<IComponent>;
  protected required: Set<IComponent>;
  protected event: ComponentEvent;

  constructor() {
    this.requiredBy = new Set<IComponent>();
    this.required = new Set<IComponent>();
    this.event = new ComponentEvent();
  }

  async setup(dependsOn: IComponent[]): Promise<this> {
    const required = this.dependencies;

    if (dependsOn.length) {
      await Promise.all(
        dependsOn.map((component) => {
          this.required.add(component);
          return component.acquire(this);
        }),
      );
    }

    for (const [key, value] of Object.entries(this)) {
      const idx = required.indexOf(value);
      if (idx > -1) Object.assign(this, { [key]: dependsOn[idx] });
    }

    await this.onSetup();
    this.event.emit(Event.active, true);
    return this;
  }

  async shutdown(): Promise<this> {
    if (this.requiredBy.size) {
      await this.event.wait(Event.acquired, false);
    }

    await this.onShutdown();
    this.event.emit(Event.active, false);
    this.required.forEach((component) => component.release(this));
    return this;
  }

  async acquire(component: IComponent): Promise<this> {
    await this.event.wait(Event.active, true);
    this.requiredBy.add(component);
    this.event.emit(Event.acquired, true);
    return this;
  }

  release(component: IComponent): this {
    this.requiredBy.delete(component);
    if (!this.requiredBy.size) this.event.emit(Event.acquired, false);
    return this;
  }

  getDependency<T>(
    componentClass: Constructor<IComponent & T>,
  ): IComponent & T {
    for (const component of this.required.values()) {
      if (component instanceof componentClass) return component;
    }
    return null;
  }

  abstract onSetup(): Promise<void>;
  abstract onShutdown(): Promise<void>;
}
