import mongoose from "mongoose";

const unsupportedTransactionPatterns = [
  /Transaction numbers are only allowed/i,
  /replica set member or mongos/i,
  /transactions are not supported/i,
];

const shouldUseTransactions = () =>
  process.env.MONGO_TRANSACTIONS_ENABLED !== "false" &&
  mongoose.connection.readyState === 1;

export const applySession = (query, session) =>
  session ? query.session(session) : query;

export const createOne = async (Model, doc, session) => {
  if (!session) return Model.create(doc);
  const [created] = await Model.create([doc], { session });
  return created;
};

export const isUnsupportedTransactionError = (error) => {
  const message = String(error?.message || "");
  return unsupportedTransactionPatterns.some((pattern) => pattern.test(message));
};

export const runWithOptionalTransaction = async (
  operation,
  { fallbackOnUnsupported = true } = {}
) => {
  if (!shouldUseTransactions()) {
    return operation({ session: null, transactional: false });
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation({ session, transactional: true });
    });
    return result;
  } catch (error) {
    if (fallbackOnUnsupported && isUnsupportedTransactionError(error)) {
      return operation({
        session: null,
        transactional: false,
        retriedWithoutTransaction: true,
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
