import {Type} from "./interfaces";
import {Component} from "./component";


export class Conductor {
    context: any;
    protected readonly patches: { [key: string]: Type<Component> };
    protected readonly components: { [key: string]: Component };

    constructor(context: any = {}) {
        this.patches = {};
        this.components = {};
        this.context = context;
    }

    async setup() {
        const scheduled: Set<Component> = new Set();
        const aws: Promise<Component>[] = [];

        const scheduling = (): void => {
            Object.values(this.components).forEach((component) => {
                if (!scheduled.has(component)) {
                    scheduled.add(component);
                    const dependsOn: Component[] = component.getRequires().map((dependencyClass) => {
                        const component = this.add(dependencyClass);
                        scheduled.add(this.add(dependencyClass));
                        return component;
                    });
                    scheduled.add(component);
                    aws.push(component.setup(dependsOn));
                }
            }, );
            if(scheduled.size !== Object.values(this.components).length) {
                scheduling();
            }
        }
        scheduling();
        await Promise.all(aws);
    }

    async shutdown() {
        await Promise.all(Object.values(this.components).map((component) => {
            return component.shutdown();
        }))
    }

    patch(componentClass: Type<Component>, patchClass: Type<Component>) {
        this.patches[componentClass.name] = patchClass;
    }

    add(componentClass: Type<Component>): Component {
        if(this.components[componentClass.name]) {
            return this.components[componentClass.name];
        }
        if(componentClass.name in this.patches) {
            componentClass = this.patches[componentClass.name];
        }
        this.components[componentClass.name] = new componentClass(this, this.context);
        return this.components[componentClass.name];
    }
}