import Notification from "../models/notificationSchema.js";

export const createNotification = async ({
    user,
    auction,
    type = "admin",
    title,
    message,
    actionPath,
    dedupeKey,
}) => {
    if (!user || !title || !message) return null;

    const payload = {
        user,
        auction,
        type,
        title,
        message,
        actionPath,
        dedupeKey,
    };

    if (dedupeKey) {
        return Notification.findOneAndUpdate(
            { dedupeKey },
            { $setOnInsert: payload },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    return Notification.create(payload);
};
