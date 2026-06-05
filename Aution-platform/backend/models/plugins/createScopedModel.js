import mongoose from "mongoose";
import { getScopedConnection } from "../../utils/demoScope.js";

const modelRegistry = new Map();
const offlineConnection = mongoose.createConnection();

const compileRegisteredModels = (connection) => {
  for (const [modelName, schema] of modelRegistry.entries()) {
    if (!connection.models[modelName]) {
      connection.model(modelName, schema);
    }
  }
};

const getModel = (modelName) => {
  let connection;
  try {
    connection = getScopedConnection();
  } catch (error) {
    if (!/MONGODB_URL is not configured|DEMO_MONGODB_URL is not configured/i.test(error.message || "")) {
      throw error;
    }
    connection = offlineConnection;
  }
  compileRegisteredModels(connection);
  return connection.model(modelName);
};

export const createScopedModel = (modelName, schema) => {
  modelRegistry.set(modelName, schema);

  const target = function ScopedMongooseModel(...args) {
    const Model = getModel(modelName);
    return Reflect.construct(Model, args);
  };

  return new Proxy(target, {
    apply(_target, _thisArg, args) {
      const Model = getModel(modelName);
      return Reflect.apply(Model, Model, args);
    },
    construct(_target, args) {
      const Model = getModel(modelName);
      return Reflect.construct(Model, args);
    },
    get(_target, prop) {
      if (prop === "__getScopedModel") {
        return () => getModel(modelName);
      }
      if (prop === "schema") {
        return schema;
      }
      if (prop === "modelName") {
        return modelName;
      }
      const Model = getModel(modelName);
      const value = Model[prop];
      return typeof value === "function" ? value.bind(Model) : value;
    },
    set(_target, prop, value) {
      const Model = getModel(modelName);
      Model[prop] = value;
      return true;
    },
    has(_target, prop) {
      return prop in getModel(modelName);
    },
    ownKeys() {
      return Reflect.ownKeys(getModel(modelName));
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(getModel(modelName), prop);
      if (!descriptor) return undefined;
      return {
        ...descriptor,
        configurable: true,
      };
    },
  });
};
