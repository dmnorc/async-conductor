import { EventEmitter } from "events";

export interface IComponentEvent {
  emitter: EventEmitter;
  events: { [key: string]: boolean };
  emit(event: string, value: boolean): void;
  wait(event: string, desired: boolean): Promise<void>;
}

export interface IComponent<C> {
  context: C;
  dependencies: Constructor<IComponent<C>, C>[];
  readonly active: Promise<void>;
  readonly inactive: Promise<void>;
  readonly acquired: Promise<void>;
  readonly released: Promise<void>;
  setup(dependsOn: IComponent<C>[]): Promise<this>;
  shutdown(): Promise<this>;
  acquire(component: IComponent<C>): Promise<this>;
  release(component: IComponent<C>): this;
  onSetup(): Promise<void>;
  onShutdown(): Promise<void>;
  getDependency<T>(componentClass: Constructor<T, C>): T;
}

export interface IConductor<C> {
  context: C;
  readonly active: Promise<void>;
  readonly inactive: Promise<void>;
  setup(): Promise<void>;
  shutdown(): Promise<void>;
  patch<T, U>(
    componentClass: Constructor<T & IComponent<C>, C>,
    patchClass: Constructor<U & T & IComponent<C>, C>,
  ): void;
  add<T>(componentClass: Constructor<T & IComponent<C>, C>): T & IComponent<C>;
  get<T>(componentClass: Constructor<T & IComponent<C>, C>): T & IComponent<C>;
}

export interface Constructor<IComponent, C> {
  new (context: C): IComponent;
}
