import {
  Constructor,
  IComponent,
  IComponentEvent,
  IConductor,
} from "./interfaces";
import { Event, EventType } from "./event";

export class Conductor<C = unknown> implements IConductor<C> {
  context: C;
  protected readonly patches: { [key: string]: Constructor<IComponent<C>, C> };
  protected readonly components: { [key: string]: IComponent<C> };
  protected event: IComponentEvent;

  constructor(context: C = null) {
    this.context = context;
    this.patches = {};
    this.components = {};
    this.event = new Event();
  }

  get active(): Promise<void> {
    return this.event.wait(EventType.active, true);
  }

  get inactive(): Promise<void> {
    return this.event.wait(EventType.active, false);
  }

  async setup(): Promise<void> {
    const scheduled: Set<IComponent<C>> = new Set();
    const aws: Promise<IComponent<C>>[] = [];

    const scheduling = (): void => {
      Object.values(this.components).forEach((component) => {
        if (!scheduled.has(component)) {
          scheduled.add(component);
          const dependsOn: IComponent<C>[] = component.dependencies.map(
            (dependencyClass) => {
              return this.add(dependencyClass);
            },
          );
          scheduled.add(component);
          aws.push(component.setup(dependsOn));
        }
      });
      if (scheduled.size !== Object.values(this.components).length) {
        scheduling();
      }
    };
    scheduling();
    await Promise.all(aws);
    this.event.emit(EventType.active, true);
    return;
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      Object.values(this.components).map((component) => {
        return component.shutdown();
      }),
    );
    this.event.emit(EventType.active, false);
  }

  patch<T, U>(
    componentClass: Constructor<T & IComponent<C>, C>,
    patchClass: Constructor<U & T & IComponent<C>, C>,
  ): void {
    this.patches[componentClass.name] = patchClass;
  }

  add<T>(componentClass: Constructor<T & IComponent<C>, C>): T & IComponent<C> {
    if (this.components[componentClass.name]) {
      return <T & IComponent<C>>this.components[componentClass.name];
    }
    if (componentClass.name in this.patches) {
      componentClass = <Constructor<T & IComponent<C>, C>>(
        this.patches[componentClass.name]
      );
    }
    this.components[componentClass.name] = <IComponent<C>>(
      new componentClass(<C>this.context)
    );
    return <T & IComponent<C>>this.components[componentClass.name];
  }

  get<T>(componentClass: Constructor<T & IComponent<C>, C>): T & IComponent<C> {
    if (componentClass.name in this.patches) {
      componentClass = <Constructor<T & IComponent<C>, C>>(
        this.patches[componentClass.name]
      );
    }
    if (this.components[componentClass.name]) {
      return <T & IComponent<C>>this.components[componentClass.name];
    }
    return null;
  }
}
