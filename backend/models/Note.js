const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    originalText: { type: String, required: true },
    summary: { type: String, default: "" },
    summaryLength: { type: String, default: "medium" },
    tag: { type: String, default: "General" },
    pinned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    outputType: { type: String, default: "summary" }, // summary | cheatsheet | roadmap | diagram
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);