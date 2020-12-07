import { EventEmitter } from "events";

export interface IComponentEvent {
  emitter: EventEmitter;
  events: { [key: string]: boolean };
  emit(event: string, value: boolean): void;
  wait(event: string, desired: boolean): Promise<boolean>;
}

export interface IComponent {
  dependencies: Constructor<IComponent>[];
  setup(dependsOn: IComponent[]): Promise<this>;
  shutdown(): Promise<this>;
  acquire(component: IComponent): Promise<this>;
  release(component: IComponent): this;
  onSetup(): Promise<void>;
  onShutdown(): Promise<void>;
  getDependency<T>(componentClass: Constructor<T>): T;
}

export interface IConductor {
  setup(): Promise<void>;
  shutdown(): Promise<void>;
  patch<T, U>(
    componentClass: Constructor<T & IComponent>,
    patchClass: Constructor<U & T & IComponent>,
  ): void;
  add<T>(componentClass: Constructor<IComponent>): T & IComponent;
  get<T>(componentClass: Constructor<T & IComponent>): T & IComponent;
}

export interface Constructor<IComponent> {
  new (): IComponent;
}
