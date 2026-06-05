import mongoose from "mongoose";
import {
  attachDemoMetadata,
  getCurrentDemoMetadata,
  getDemoScopeFilter,
} from "../../utils/demoScope.js";

const scopedQueryOperations = [
  "count",
  "countDocuments",
  "deleteMany",
  "deleteOne",
  "find",
  "findOne",
  "findOneAndDelete",
  "findOneAndRemove",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
  "updateMany",
  "updateOne",
];

const addQueryScope = function addQueryScope() {
  const scopeFilter = getDemoScopeFilter();
  if (Object.keys(scopeFilter).length === 0) return;

  this.where(scopeFilter);

  if (this.options?.upsert || this.getOptions?.().upsert) {
    const metadata = getCurrentDemoMetadata();
    if (metadata.isDemo) {
      const update = this.getUpdate?.() || {};
      const updateUsesOperators = Object.keys(update).some((key) =>
        key.startsWith("$")
      );
      if (updateUsesOperators) {
        update.$setOnInsert = {
          ...(update.$setOnInsert || {}),
          ...metadata,
        };
        this.setUpdate(update);
      } else {
        this.setUpdate({
          $set: update,
          $setOnInsert: metadata,
        });
      }
    }
  }
};

const addAggregateScope = function addAggregateScope() {
  const scopeFilter = getDemoScopeFilter();
  if (Object.keys(scopeFilter).length === 0) return;

  const pipeline = this.pipeline();
  const firstStage = pipeline[0] || {};
  const insertAt = firstStage.$geoNear || firstStage.$search ? 1 : 0;
  pipeline.splice(insertAt, 0, { $match: scopeFilter });
};

export const demoScopedModel = (schema) => {
  schema.add({
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    demoSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemoSession",
      index: true,
    },
    demoExpiresAt: {
      type: Date,
    },
  });

  schema.index({ isDemo: 1, demoSessionId: 1 });
  schema.index({ demoExpiresAt: 1 });

  schema.pre("validate", function addDemoMetadataBeforeValidate(next) {
    attachDemoMetadata(this);
    next();
  });

  schema.pre("save", function addDemoMetadataBeforeSave(next) {
    attachDemoMetadata(this);
    next();
  });

  scopedQueryOperations.forEach((operation) => {
    schema.pre(operation, addQueryScope);
  });

  schema.pre("aggregate", addAggregateScope);
};
