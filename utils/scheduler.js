// <= IMPORTS =>
import cron from "node-cron";
import { Message } from "../models/message.model.js";
import { ScheduledMessage } from "../models/scheduledMessage.model.js";

const startScheduler = (io) => {
  // RUNNING EVERY MINUTE
  cron.schedule("* * * * *", async () => {
    // SETTING CURRENT DATE
    const now = new Date();
    // FINDING PENDING SCHEDULED MESSAGES
    const dueMessages = await ScheduledMessage.find({
      status: "PENDING",
      sendAt: { $lte: now },
    });
    // FOR EVERY PENDING SCHEDULE MESSAGE
    for (let scheduled of dueMessages) {
      // CREATING A REAL MESSAGE
      const message = await Message.create({
        room: scheduled.room,
        sender: scheduled.sender,
        text: scheduled.text,
        parent: scheduled.parent,
        readBy: [scheduled.sender],
      });
      // BROADCASTING TO ROOM
      io.to(scheduled.room.toString()).emit(
        "chatMessage",
        await message.populate("sender", "fullName profile.profilePhoto")
      );
      // DELETING THE ORIGINAL SCHEDULED MESSAGE
      await ScheduledMessage.findByIdAndDelete(scheduled._id);
    }
  });
};

export default startScheduler;
