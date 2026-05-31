import mongoose from 'mongoose';

let connectionPromise;
let lastConnectionError = null;

const getServerSelectionTimeout = () => {
    const configuredTimeout = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS);
    return Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 5000;
};

export const connection = () => {
    if (!process.env.MONGODB_URL) {
        lastConnectionError = new Error("MONGODB_URL is not configured");
        return Promise.reject(lastConnectionError);
    }

    if (mongoose.connection.readyState === 1) {
        lastConnectionError = null;
        return Promise.resolve(mongoose.connection);
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(process.env.MONGODB_URL, {
        serverSelectionTimeoutMS: getServerSelectionTimeout(),
    })
        .then(() => {
            lastConnectionError = null;
            console.log('Connected to Database');
            return mongoose.connection;
        })
        .catch((error) => {
            lastConnectionError = error;
            connectionPromise = null;
            throw error;
        });

    return connectionPromise;
};

export const getConnectionStatus = () => ({
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    error: lastConnectionError?.message || null,
});
