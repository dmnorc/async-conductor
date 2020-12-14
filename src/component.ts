import { Constructor, IComponent, IEvent } from "./interfaces";
import { Event } from "./event";

export abstract class Component<C = unknown> implements IComponent<C> {
  context: C;
  dependencies: Constructor<IComponent<C>, C>[] = [];
  protected requiredBy: Set<IComponent<C>>;
  protected required: Set<IComponent<C>>;
  protected activeEvent: IEvent;
  protected acquireEvent: IEvent;

  constructor(context: C) {
    this.context = context;
    this.requiredBy = new Set<IComponent<C>>();
    this.required = new Set<IComponent<C>>();
    this.activeEvent = new Event();
    this.acquireEvent = new Event();
  }

  get active(): Promise<void> {
    return this.activeEvent.wait(true);
  }

  get inactive(): Promise<void> {
    return this.activeEvent.wait(false);
  }

  get acquired(): Promise<void> {
    return this.acquireEvent.wait(true);
  }

  get released(): Promise<void> {
    return this.acquireEvent.wait(false);
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
    this.activeEvent.set();
    return this;
  }

  async shutdown(): Promise<this> {
    if (this.requiredBy.size) {
      await this.released;
    }

    await this.onShutdown();
    this.activeEvent.clear();
    this.required.forEach((component) => component.release(this));
    return this;
  }

  async acquire(component: IComponent<C>): Promise<this> {
    await this.active;
    this.requiredBy.add(component);
    this.acquireEvent.set();
    return this;
  }

  release(component: IComponent<C>): this {
    this.requiredBy.delete(component);
    if (!this.requiredBy.size) {
      this.acquireEvent.clear();
    }
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
