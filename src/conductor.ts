import { Constructor, IComponent, IConductor } from "./interfaces";

export class Conductor implements IConductor {
  protected readonly patches: { [key: string]: Constructor<IComponent> };
  protected readonly components: { [key: string]: IComponent };

  constructor() {
    this.patches = {};
    this.components = {};
  }

  async setup(): Promise<void> {
    const scheduled: Set<IComponent> = new Set();
    const aws: Promise<IComponent>[] = [];

    const scheduling = (): void => {
      Object.values(this.components).forEach((component) => {
        if (!scheduled.has(component)) {
          scheduled.add(component);
          const dependsOn: IComponent[] = component.dependencies.map(
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
    return;
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      Object.values(this.components).map((component) => {
        return component.shutdown();
      }),
    );
  }

  patch<T, U>(
    componentClass: Constructor<T & IComponent>,
    patchClass: Constructor<U & T & IComponent>,
  ): void {
    this.patches[componentClass.name] = patchClass;
  }

  add<T>(componentClass: Constructor<IComponent>): T & IComponent {
    if (this.components[componentClass.name]) {
      return <T & IComponent>this.components[componentClass.name];
    }
    if (componentClass.name in this.patches) {
      componentClass = this.patches[componentClass.name];
    }
    this.components[componentClass.name] = new componentClass();
    return <T & IComponent>this.components[componentClass.name];
  }

  get<T>(componentClass: Constructor<T & IComponent>): T & IComponent {
    if (this.components[componentClass.name]) {
      return <T & IComponent>this.components[componentClass.name];
    }
    return null;
  }
}
