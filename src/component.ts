import { Constructor, IComponent, IComponentEvent } from "./interfaces";
import { Event, EventType } from "./event";

export abstract class Component<C = unknown> implements IComponent<C> {
  context: C;
  dependencies: Constructor<IComponent<C>, C>[] = [];
  protected requiredBy: Set<IComponent<C>>;
  protected required: Set<IComponent<C>>;
  protected event: IComponentEvent;

  constructor(context: C) {
    this.context = context;
    this.requiredBy = new Set<IComponent<C>>();
    this.required = new Set<IComponent<C>>();
    this.event = new Event();
  }

  get active(): Promise<boolean> {
    return this.event.wait(EventType.active, true);
  }

  get inactive(): Promise<boolean> {
    return this.event.wait(EventType.active, false);
  }

  get acquired(): Promise<boolean> {
    return this.event.wait(EventType.acquired, true);
  }

  get released(): Promise<boolean> {
    return this.event.wait(EventType.acquired, false);
  }

  async setup(dependsOn: IComponent<C>[]): Promise<this> {
    if (dependsOn.length) {
      await Promise.all(
        dependsOn.map((component) => {
          this.required.add(component);
          return component.acquire(this);
        }),
      );
    }

    await this.onSetup();
    this.event.emit(EventType.active, true);
    return this;
  }

  async shutdown(): Promise<this> {
    if (this.requiredBy.size) {
      await this.released;
    }

    await this.onShutdown();
    this.event.emit(EventType.active, false);
    this.required.forEach((component) => component.release(this));
    return this;
  }

  async acquire(component: IComponent<C>): Promise<this> {
    await this.active;
    this.requiredBy.add(component);
    this.event.emit(EventType.acquired, true);
    return this;
  }

  release(component: IComponent<C>): this {
    this.requiredBy.delete(component);
    if (!this.requiredBy.size) this.event.emit(EventType.acquired, false);
    return this;
  }

  getDependency<T>(
    componentClass: Constructor<IComponent<C> & T, C>,
  ): IComponent<C> & T {
    for (const component of this.required.values()) {
      if (component instanceof componentClass) return component;
    }
    return null;
  }

  abstract onSetup(): Promise<void>;
  abstract onShutdown(): Promise<void>;
}
