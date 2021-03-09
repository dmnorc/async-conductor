export interface IEvent {
  state: boolean;
  set(): void;
  clear(): void;
  wait(isSet: boolean): Promise<void>;
}

export interface IComponent<C> {
  context: C;
  dependencies: Constructor<IComponent<C>, C>[];
  readonly active: Promise<void>;
  readonly inactive: Promise<void>;
  readonly acquired: Promise<void>;
  readonly released: Promise<void>;
  readonly isActive: boolean;
  readonly isAcquired: boolean;
  setup(dependsOn: IComponent<C>[]): Promise<this>;
  shutdown(): Promise<this>;
  reload(): Promise<this>;
  acquire(component: IComponent<C>): Promise<this>;
  release(component: IComponent<C>): this;
  onSetup(): Promise<void>;
  onShutdown(): Promise<void>;
  getDependency<T>(componentClass: Constructor<T, C>): T;
  healthCheck(): Promise<boolean>;
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
  healthCheck(): Promise<boolean>;
}

export interface Constructor<IComponent, C> {
  new (context: C): IComponent;
}
