import { Constructor, IComponent } from "./interfaces";

export class ConductorError<C = unknown> extends Error {
  readonly component: Constructor<IComponent<C>, C>;

  constructor(message?: string, component?: Constructor<IComponent<C>, C>) {
    super(message);
    this.component = component;
  }
}
