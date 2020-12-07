import { it } from "mocha";

import { ComponentEvent, Event } from "../src";

it("Test ComponentEvent", async () => {
  const event = new ComponentEvent();
  event.emit(Event.active, true);
  await event.wait(Event.active, true);
  await Promise.all([
    event.wait(Event.active, false),
    new Promise<void>((resolve) => {
      process.nextTick(() => {
        event.emit(Event.active, true);
        process.nextTick(() => {
          event.emit(Event.active, false);
          resolve();
        });
      });
    }),
  ]);
});
