import { describe, it } from "mocha";
import { expect } from "chai";

import { Conductor, Component } from "../src";

interface Context {
  [key: string]: string;
}

class ResultComponent extends Component<Context> {
  [key: string]: unknown;

  async onSetup(): Promise<void> {
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
  it("Test Conductor Basic FLow", async () => {
    const testConductorNullableContext = new Conductor();
    expect(testConductorNullableContext.context).to.be.null;
    const context: Context = {};
    const testConductor = new Conductor<Context>(context);
    expect(testConductor.context).to.be.equal(context);
    testConductor.add(TestComponent);
    const testComponent = testConductor.get(TestComponent);
    expect(testComponent.context).to.be.equal(context);
    await testComponent.inactive;
    expect(testConductor.get(ResultComponent)).to.be.null;
    await Promise.all([
      testConductor.setup(),
      testConductor.active,
      testComponent.active,
      testComponent.released,
    ]);
    const result = testConductor.get(ResultComponent);
    expect(result.context).to.be.equal(context);
    await result.acquired;
    await result.active;
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

  it("Test Component Patch", async () => {
    const testConductor = new Conductor({});
    testConductor.patch(TestComponent2, MockTestComponent);
    testConductor.add(TestComponent);
    await testConductor.setup();
    const result = testConductor.get(ResultComponent);
    const testComponent = testConductor.get(TestComponent2);
    expect(testConductor.get(MockTestComponent)).to.be.equal(testComponent);
    testComponent.testMethod();
    expect(result.getResult(TestComponent2.name)).to.be.undefined;
    expect(result.getResult(MockTestComponent.name)).to.be.true;
    expect(result.getResult("test")).to.be.true;
    await testConductor.shutdown();
    expect(result.getResult(TestComponent2.name)).to.be.undefined;
    expect(result.getResult(MockTestComponent.name)).to.be.false;
  });
});
