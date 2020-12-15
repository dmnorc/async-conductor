# async-conductor [![Build Status](https://travis-ci.org/dmnorc/async-conductor.svg?branch=main)](https://travis-ci.org/dmnorc/async-conductor) ![Codecov](https://img.shields.io/codecov/c/github/dmnorc/async-conductor) ![npm](https://img.shields.io/npm/v/async-conductor) ![npm](https://img.shields.io/npm/dm/async-conductor)
Async Conductor - library that helps to orchestrate asynchronous application 
components. Inspired by python library: 
[AIOConductor](https://pypi.org/project/AIOConductor/).

## Usage
It can be a difficult task to set up and shutdown all application components such as 
database, queue and so on in right order if we are talking about async 
application.
 
How it can be solved by Async Conductor:
```typescript
import { Conductor, Component } from "async-conductor";

// You can use context that transfered from conductor to components, by default it's unknown
// it's accessable via .context propery in conductor and containers instances 
interface Context {
  [key: string]: string;
}


class AsyncLogger extends Component<Context> {
    async onSetup(): Promise<void> {
      // Setup logger here
    }
    
    async onShutdown(): Promise<void> {
      // Teardown logger here
    }
    info(): void {}
    warn(): void {}
    error(): void {}
}

class Database extends Component<Context> {
    dependencies = [AsyncLogger];

    async onSetup(): Promise<void> {
      const logger = this.getDependency(AsyncLogger);
      logger.info("Starting connection");
      const host = this.context.host;
      // Setup connection here
    }
    
    async onShutdown(): Promise<void> {
      logger.info("Clisong connection");
      // Close connection here
    }

    async typicalDBMethod(): Promise<void> {
      // code here
    }
}

class API extends Component<Context> {
    dependencies = [AsyncLogger, Database];

    async onSetup(): Promise<void> {
      const database = this.getDependency(Database);
      await database.typicalDBMethod();
      const logger = this.getDependency(AsyncLogger);
      logger.info("Starting webServer...");
      // Setup web server
    }
  
    async onShutdown(): Promise<void> {
      logger.info("Shutdown webServer...");
      // Shutdown web server
    }
}

const apiConductor = new Conductor<Context>({"host": "localhost"});
apiConductor.add(API);

apiConductor.setup().then(() => {
  const logger = apiConductor.get(AsyncLogger);
  logger.info("Conductor estabileshed");
}).catch((error) => {
  console.log("something goes wrong");
});

// State getters, the same for component and acuired, released for dependancy state.
// Attention! - they resolve only when conductor or component in this state, can make infinite await.
apiConductor.active.then(() => {
  const logger = apiConductor.get(AsyncLogger);
  logger.info("Conductor estabileshed");
});

apiConductor.inactive.then(() => {
  const logger = apiConductor.get(AsyncLogger);
  logger.info("condcutor is inactive");
});

process.on('exit', function () {
    apiConductor.shutdown().catch((error) => {
      console.log("something goes wrong");
    }).finally(() => {
      console.log("condcutor is inactive");
    });
});
```
Conductor setup all your components in right order: if a component 
has dependencies they are setup before the component. 
This is the same for the shutdown process - all dependencies are teared down 
before the main component.

### Testing
Component can be patched for testing purposes. All other components depending on the original will use patched instance.
```typescript
class Database extends Component {
  dependencies = [AsyncLogger];

  async onSetup(): Promise<void> {
    const logger = this.getDependency(AsyncLogger);
    logger.info("Starting connection");
    const host = this.context.host;
    // Setup connection here
  }

  async onShutdown(): Promise<void> {
    logger.info("Clisong connection");
    // Close connection here
  }

  async typicalDBMethod(): Promise<void> {
    // code here
  }
}

class API extends Component {
  dependencies = [Database];

  async onSetup(): Promise<void> {
    const database = this.getDependency(Database);
    await database.typicalDBMethod();
    const logger = this.getDependency(AsyncLogger);
    logger.info("Starting webServer...");
    // Setup web server
  }

  async onShutdown(): Promise<void> {
    logger.info("Shutdown webServer...");
    // Shutdown web server
  }
}

class MockDatabase extends Database {
  dependencies = [AsyncLogger];

  async onSetup(): Promise<void> {
    // don't connect
  }

  async onShutdown(): Promise<void> {
    // nothing to close.
  }

  async typicalDBMethod(): Promise<void> {
    // overriding code.
  }
}

const apiConductor = new Conductor();
apiConductor.add(API);
// Must be before setting up.
apiConductor.patch(Database, MockDatabase);

apiConductor.setup().then(() => {
  const mockDB = apiConductor.get(Database);
  logger.info("Conductor estabileshed");
}).catch((error) => {
  console.log("something goes wrong");
});
```





