import {EventEmitter} from 'events';
import {Type} from "@src/interfaces";


enum Event {
    active = "active",
    acquired = "acquired"
}


class ComponentEvent extends EventEmitter {
    events: { [key: string]: boolean }  = {};

    emit(event: Event, value: boolean) {
        this.events[event] = value;
        return super.emit(event, value);
    }

    async wait(event: string, desired: boolean): Promise<boolean> {
        if (this.events[event] === desired) return desired;
        return await new Promise((resolve) => {
            this.on(event, (value: boolean) => {
                if(desired === value) {
                    resolve(value);
                }
            });
        });
    }
}


export abstract class Component {
    context: any;
    protected requiredBy: Set<Component> = new Set<Component>();
    protected event: ComponentEvent;

    constructor(config: {}) {
        this.context = config;
        this.event = new ComponentEvent();
    }

    getRequires(): Type<Component>[] {
        return Object.values(this).reduce((acc, value) => {
            if (!!value && value.prototype instanceof Component) {
                acc.push(value);
            }
            return acc;
        }, []);
    }

    async setup(dependsOn: Component[]) : Promise<this> {
        const required = this.getRequires();

        if(dependsOn.length) {
            await Promise.all(dependsOn.map((component) => component.acquire(this)));
        }

        for (let [key, value] of Object.entries(this)) {
            const idx = required.indexOf(value);
            // @ts-ignore
            this[key] = dependsOn[idx];
        }

        await this.onSetup();
        this.event.emit(Event.active, true);
        return this;
    }

    async shutdown() : Promise<this> {
        if (this.requiredBy.size) {
            await this.event.wait(Event.acquired, false);
        }

        await this.onShutdown();
        this.event.emit(Event.active, false);
        this.requiredBy.forEach((component) => component.release(this));
        return this;
    }

    async acquire(component: Component): Promise<this> {
        await this.event.wait("active", true);
        this.requiredBy.add(component);
        this.event.emit(Event.acquired, true);
        return this;
    }

    release(component: Component): this {
        this.requiredBy.delete(component);
        if(!this.requiredBy.size) this.event.emit(Event.acquired, false);
        return this;
    }

    abstract onSetup(): Promise<any>;
    abstract onShutdown(): Promise<any>;
}