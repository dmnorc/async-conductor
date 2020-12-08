import { Constructor, IComponent, IComponentEvent } from "./interfaces";
import { ComponentEvent, Event } from "./event";

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
    this.event = new ComponentEvent();
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

  async acquire(component: IComponent<C>): Promise<this> {
    await this.event.wait(Event.active, true);
    this.requiredBy.add(component);
    this.event.emit(Event.acquired, true);
    return this;
  }

  release(component: IComponent<C>): this {
    this.requiredBy.delete(component);
    if (!this.requiredBy.size) this.event.emit(Event.acquired, false);
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
