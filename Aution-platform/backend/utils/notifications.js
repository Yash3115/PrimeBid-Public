import Notification from "../models/notificationSchema.js";

export const createNotification = async ({
    user,
    auction,
    type = "admin",
    title,
    message,
    actionPath,
}) => {
    if (!user || !title || !message) return null;

    return Notification.create({
        user,
        auction,
        type,
        title,
        message,
        actionPath,
    });
};
