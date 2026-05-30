import mongoose from 'mongoose';

let connectionPromise;

export const connection = () => {
    if (!process.env.MONGODB_URL) {
        return Promise.reject(new Error("MONGODB_URL is not configured"));
    }

    if (mongoose.connection.readyState === 1) {
        return Promise.resolve(mongoose.connection);
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(process.env.MONGODB_URL)
        .then(() => {
            console.log('Connected to Database');
            return mongoose.connection;
        })
        .catch((error) => {
            connectionPromise = null;
            throw error;
        });

    return connectionPromise;
};
