import { it } from "mocha";

import { Event } from "../src";

it("Test ComponentEvent", async () => {
  const event = new Event();
  event.set();
  await event.wait(true);
  event.clear();
  await Promise.all([
    event.wait(true),
    new Promise<void>((resolve) => {
      process.nextTick(() => {
        event.clear();
        process.nextTick(() => {
          event.set();
          resolve();
        });
      });
    }),
  ]);
});
