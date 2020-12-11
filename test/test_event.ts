import { it } from "mocha";

import { EventType, Event } from "../src";

it("Test ComponentEvent", async () => {
  const event = new Event();
  event.emit(EventType.active, true);
  await event.wait(EventType.active, true);
  await Promise.all([
    event.wait(EventType.active, false),
    new Promise<void>((resolve) => {
      process.nextTick(() => {
        event.emit(EventType.active, true);
        process.nextTick(() => {
          event.emit(EventType.active, false);
          resolve();
        });
      });
    }),
  ]);
});
