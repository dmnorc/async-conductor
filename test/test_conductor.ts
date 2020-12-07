import { describe, it } from "mocha";
import { expect } from "chai";

import { Conductor, Component } from "../src";

class ResultComponent extends Component {
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

class TestComponent2 extends Component {
  dependencies = [ResultComponent];

  async onSetup(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, true);
  }

  async onShutdown(): Promise<void> {
    const result = this.getDependency(ResultComponent);
    result.addResult(this.constructor.name, false);
  }
}

class TestComponent extends Component {
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
}

describe("Test Conductor", () => {
  it("Test Conductor Basic FLow", async () => {
    const testConductor = new Conductor();
    testConductor.add(TestComponent);
    expect(testConductor.get(ResultComponent)).to.be.null;
    await testConductor.setup();
    const result = testConductor.get(ResultComponent);
    expect(result.getResult(TestComponent.name)).to.be.true;
    expect(result.getResult(TestComponent2.name)).to.be.true;
    const testComponent = testConductor.get(TestComponent);
    const testComponent2 = testConductor.get(TestComponent2);
    expect(testComponent.getDependency(TestComponent)).to.be.null;
    expect(testComponent.getDependency(TestComponent2)).to.be.equals(
      testComponent2,
    );
    await testConductor.shutdown();
    expect(result.getResult(TestComponent.name)).to.be.false;
    expect(result.getResult(TestComponent2.name)).to.be.false;
  });

  it("Test Component Patch", async () => {
    const testConductor = new Conductor();
    testConductor.patch(TestComponent2, MockTestComponent);
    testConductor.add(TestComponent);
    await testConductor.setup();
    const result = testConductor.get(ResultComponent);
    expect(result.getResult(TestComponent2.name)).to.be.undefined;
    expect(result.getResult(MockTestComponent.name)).to.be.true;
    await testConductor.shutdown();
    expect(result.getResult(TestComponent2.name)).to.be.undefined;
    expect(result.getResult(MockTestComponent.name)).to.be.false;
  });
});
