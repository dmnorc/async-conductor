import { describe, it } from "mocha";
import { expect } from "chai";

import { Conductor, Component } from "../src";
import { ConductorError } from "../dist";

interface Context {
  [key: string]: string;
}

class ResultComponent extends Component<Context> {
  [key: string]: unknown;
  health: boolean;

  async onSetup(): Promise<void> {
    this.health = true;
    return;
  }

  async onShutdown(): Promise<void> {
    return;
  }

  addResult(name: string, result: unknown): void {
    this[name] = result;
  }

  getResult(name: string): unknown {
    return this[name];
  }

  async healthCheck(): Promise<boolean> {
    return this.health;
  }
}

class TestComponent2 extends Component<Context> {
  dependencies = [ResultComponent];

  async onSetup(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, true);
  }

  async onShutdown(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, false);
  }

  testMethod(): void {
    const result = this.getDependency(ResultComponent);
    result.addResult("test", true);
  }
}

class TestComponent extends Component<Context> {
  dependencies = [ResultComponent, TestComponent2];

  async onSetup(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, true);
  }

  async onShutdown(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, false);
  }
}

class MockTestComponent extends TestComponent2 {
  async onSetup(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, true);
  }

  async onShutdown(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, false);
  }

  testMethod(): void {
    const result = this.getDependency(ResultComponent);
    result.addResult("test", true);
  }
}

describe("Test Conductor", () => {
  it("Basic FLow", async () => {
    const testConductorNullableContext = new Conductor();
    expect(testConductorNullableContext.context).to.be.null;
    const context: Context = {};
    const testConductor = new Conductor<Context>(context);
    expect(testConductor.context).to.be.equal(context);
    testConductor.add(TestComponent);
    const testComponent = testConductor.get(TestComponent);
    expect(testComponent.context).to.be.equal(context);
    await testComponent.inactive;
    expect(testComponent.isActive).to.be.false;
    expect(testConductor.get(ResultComponent)).to.be.null;
    await Promise.all([
      testConductor.setup(),
      testConductor.active,
      testComponent.active,
      testComponent.released,
    ]);
    expect(testComponent.isActive).to.be.true;
    const result = testConductor.get(ResultComponent);
    expect(result.context).to.be.equal(context);
    await result.acquired;
    await result.active;
    expect(result.isActive).to.be.true;
    expect(result.isAcquired).to.be.true;
    expect(result.getResult(TestComponent.name)).to.be.true;
    expect(result.getResult(TestComponent2.name)).to.be.true;
    const testComponent2 = testConductor.get(TestComponent2);
    expect(testComponent2.context).to.be.equal(context);
    await testComponent2.acquired;
    await testComponent2.active;
    expect(testComponent.getDependency(TestComponent)).to.be.null;
    expect(testComponent.getDependency(TestComponent2)).to.be.equals(
      testComponent2,
    );
    await Promise.all([testConductor.shutdown(), testConductor.inactive]);
    expect(result.getResult(TestComponent.name)).to.be.false;
    expect(result.getResult(TestComponent2.name)).to.be.false;
    await Promise.race([
      testComponent2.released,
      testComponent2.inactive,
      result.released,
      result.inactive,
    ]);
  });

  it("Patch", async () => {
    const testConductor = new Conductor({});
    testConductor.patch(TestComponent2, MockTestComponent);
    testConductor.add(TestComponent);
    await testConductor.setup();
    const result = testConductor.get(ResultComponent);
    const testComponent = testConductor.get(TestComponent2);
    testComponent.testMethod();
    expect(result.getResult(TestComponent2.name)).to.be.undefined;
    expect(result.getResult(MockTestComponent.name)).to.be.true;
    expect(result.getResult("test")).to.be.true;
    await testConductor.shutdown();
    expect(result.getResult(TestComponent2.name)).to.be.undefined;
    expect(result.getResult(MockTestComponent.name)).to.be.false;
  });

  it("HealthCheck", async () => {
    const testConductor = new Conductor({});
    testConductor.add(TestComponent);
    await testConductor.setup();
    expect(await testConductor.healthCheck()).to.be.true;
    const result = testConductor.get(ResultComponent);
    result.health = false;
    try {
      await testConductor.healthCheck();
      expect(await testConductor.healthCheck()).to.be.false;
    } catch (e) {
      const error = <ConductorError>e;
      expect(error.component).to.be.equal(ResultComponent);
    }
    await result.reload();
    expect(await testConductor.healthCheck()).to.be.true;
  });
});
