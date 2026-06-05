import mongoose from 'mongoose';

export const DATABASE_MODES = Object.freeze({
    PRODUCTION: "production",
    DEMO: "demo",
});

const connectionState = {
    [DATABASE_MODES.PRODUCTION]: {
        connection: null,
        promise: null,
        error: null,
    },
    [DATABASE_MODES.DEMO]: {
        connection: null,
        promise: null,
        error: null,
    },
};

const getServerSelectionTimeout = () => {
    const configuredTimeout = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS);
    return Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : 5000;
};

export const normalizeDatabaseMode = (mode) =>
    mode === DATABASE_MODES.DEMO ? DATABASE_MODES.DEMO : DATABASE_MODES.PRODUCTION;

export const getDatabaseUrl = (mode = DATABASE_MODES.PRODUCTION) => {
    const normalizedMode = normalizeDatabaseMode(mode);
    return normalizedMode === DATABASE_MODES.DEMO
        ? process.env.DEMO_MONGODB_URL
        : process.env.MONGODB_URL;
};

export const isDemoDatabaseAvailable = () =>
    process.env.DEMO_DISABLED !== "true" && Boolean(process.env.DEMO_MONGODB_URL?.trim());

const getState = (mode) => connectionState[normalizeDatabaseMode(mode)];

export const getConnectionInstance = (mode = DATABASE_MODES.PRODUCTION) => {
    const normalizedMode = normalizeDatabaseMode(mode);
    const state = getState(normalizedMode);
    if (state.connection) return state.connection;

    const databaseUrl = getDatabaseUrl(normalizedMode);
    if (!databaseUrl) {
        state.error = new Error(
            normalizedMode === DATABASE_MODES.DEMO
                ? "DEMO_MONGODB_URL is not configured"
                : "MONGODB_URL is not configured"
        );
        throw state.error;
    }

    state.connection = mongoose.createConnection(databaseUrl, {
        serverSelectionTimeoutMS: getServerSelectionTimeout(),
    });
    state.connection.on("disconnected", () => {
        state.promise = null;
    });
    state.connection.on("error", (error) => {
        state.error = error;
        state.promise = null;
    });
    return state.connection;
};

export const connection = (mode = DATABASE_MODES.PRODUCTION) => {
    const normalizedMode = normalizeDatabaseMode(mode);
    const state = getState(normalizedMode);
    let scopedConnection;

    try {
        scopedConnection = getConnectionInstance(normalizedMode);
    } catch (error) {
        return Promise.reject(error);
    }

    if (scopedConnection.readyState === 1) {
        state.error = null;
        return Promise.resolve(scopedConnection);
    }

    if (state.promise) {
        return state.promise;
    }

    state.promise = scopedConnection.asPromise()
        .then(() => {
            state.error = null;
            console.log(
                normalizedMode === DATABASE_MODES.DEMO
                    ? "Connected to Demo Database"
                    : "Connected to Database"
            );
            return scopedConnection;
        })
        .catch((error) => {
            state.error = error;
            state.promise = null;
            throw error;
        });

    return state.promise;
};

export const getConnectionStatus = (mode = DATABASE_MODES.PRODUCTION) => {
    const normalizedMode = normalizeDatabaseMode(mode);
    const state = getState(normalizedMode);
    return {
        mode: normalizedMode,
        configured: Boolean(getDatabaseUrl(normalizedMode)),
        connected: state.connection?.readyState === 1,
        readyState: state.connection?.readyState || 0,
        error: state.error?.message || null,
    };
};
