import { Constructor, IComponent, IEvent, IConductor } from "./interfaces";
import { Event } from "./event";
import { ConductorError } from "./errors";

export class Conductor<C = unknown> implements IConductor<C> {
  context: C;
  protected readonly patches: { [key: string]: Constructor<IComponent<C>, C> };
  protected readonly components: { [key: string]: IComponent<C> };
  protected activeEvent: IEvent;

  constructor(context: C = null) {
    this.context = context;
    this.patches = {};
    this.components = {};
    this.activeEvent = new Event();
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
   * setup conductor and all added components.
   */
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
    this.activeEvent.set();
    return;
  }

  /**
   * shutdown conductor and all added components.
   */
  async shutdown(): Promise<void> {
    await Promise.all(
      Object.values(this.components).map((component) => {
        return component.shutdown();
      }),
    );
    this.activeEvent.clear();
  }

  /**
   * Patch componentClass by some another patchClass extends the first one.
   * Can be useful in tests when need to replace some functionality of initial component
   * @param componentClass
   * @param patchClass
   */
  patch<T, U>(
    componentClass: Constructor<T & IComponent<C>, C>,
    patchClass: Constructor<U & T & IComponent<C>, C>,
  ): void {
    this.patches[componentClass.name] = patchClass;
  }

  /**
   * Add component that needed to be initialized by conductor
   * @param componentClass
   */
  add<T>(componentClass: Constructor<T & IComponent<C>, C>): T & IComponent<C> {
    const name = componentClass.name;
    if (this.components[name]) {
      return <T & IComponent<C>>this.components[name];
    }
    if (name in this.patches) {
      componentClass = <Constructor<T & IComponent<C>, C>>this.patches[name];
    }
    this.components[name] = <IComponent<C>>new componentClass(<C>this.context);
    return <T & IComponent<C>>this.components[name];
  }

  /**
   * get instance of a component
   *
   * @param componentClass
   */
  get<T>(componentClass: Constructor<T & IComponent<C>, C>): T & IComponent<C> {
    const name = componentClass.name;
    if (this.components[name]) {
      return <T & IComponent<C>>this.components[name];
    }
    return null;
  }

  /**
   * checks if all added components is ok, if not throws ConductorError with componentClass that is not ok.
   * @throws {ConductorError}
   */
  async healthCheck(): Promise<boolean | never> {
    const components = Object.values(this.components);

    const result = await Promise.all(
      components.map((component) => {
        return component.healthCheck();
      }),
    );

    result.forEach((val, idx) => {
      if (!val)
        throw new ConductorError(
          "healthCheck is not passed",
          <Constructor<IComponent<C>, C>>components[idx].constructor,
        );
    });

    return true;
  }
}
