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


class AsyncLogger extends Component {
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

class Database extends Component {
    dependencies = [AsyncLogger];

    async onSetup(): Promise<void> {
      const logger = this.getDependency(AsyncLogger);
      logger.info("Starting connection");
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

const apiConductor = new Conductor();
apiConductor.add(API);

apiConductor.setup().then(() => {
  const logger = apiConductor.get(AsyncLogger);
  logger.info("Conductor estabileshed");
}).catch((error) => {
  console.log("something goes wrong");
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




