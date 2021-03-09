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

  /**
   * Wait when component is active
   */
  get active(): Promise<void> {
    return this.activeEvent.wait(true);
  }

  /**
   * Wait when component is inactive
   */
  get inactive(): Promise<void> {
    return this.activeEvent.wait(false);
  }

  /**
   * Wait when component is acquired
   */
  get acquired(): Promise<void> {
    return this.acquireEvent.wait(true);
  }

  /**
   * Wait when component is released
   */
  get released(): Promise<void> {
    return this.acquireEvent.wait(false);
  }

  /**
   * checks if component is active
   */
  get isActive(): boolean {
    return this.activeEvent.state;
  }

  /**
   * checks if component is acquired
   */
  get isAcquired(): boolean {
    return this.acquireEvent.state;
  }

  /**
   * setup component, uses by conductor
   */
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

  /**
   * shutdown component, uses by conductor
   */
  async shutdown(): Promise<this> {
    if (this.requiredBy.size) {
      await this.released;
    }

    await this.onShutdown();
    this.activeEvent.clear();
    this.required.forEach((component) => component.release(this));
    return this;
  }

  /**
   * Reloads the component and all other components depends on it.
   */
  async reload(): Promise<this> {
    this.activeEvent.clear();
    await this.onShutdown();
    await this.onSetup();
    this.requiredBy.forEach((component) => component.reload());
    this.activeEvent.set();
    return this;
  }

  /**
   * healthCheck method, by default always returns true
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Acquire component, uses by another component depends on this component
   * @param component
   */
  async acquire(component: IComponent<C>): Promise<this> {
    await this.active;
    this.requiredBy.add(component);
    this.acquireEvent.set();
    return this;
  }

  /**
   * Release component, uses by another component depends on this component
   * @param component
   */
  release(component: IComponent<C>): this {
    this.requiredBy.delete(component);
    if (!this.requiredBy.size) {
      this.acquireEvent.clear();
    }
    return this;
  }

  /**
   * Gets instanceOf dependency by dependency class
   * @param componentClass
   */
  getDependency<T>(
    componentClass: Constructor<IComponent<C> & T, C>,
  ): IComponent<C> & T {
    for (const component of this.required.values()) {
      if (component instanceof componentClass) return component;
    }
    return null;
  }

  /**
   * called on setting up a component
   * required to be implemented
   */
  abstract onSetup(): Promise<void>;

  /**
   * called on shutting down a component
   * required to be implemented
   */
  abstract onShutdown(): Promise<void>;
}
