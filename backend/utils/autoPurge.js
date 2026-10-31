const Note = require("../models/Note");

const autoPurgeOldTrash = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Note.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: thirtyDaysAgo },
    });

    if (result.deletedCount > 0) {
      console.log(`Auto-purged ${result.deletedCount} note(s) older than 30 days from trash`);
    }
  } catch (error) {
    console.error("Auto-purge error:", error.message);
  }
};

module.exports = autoPurgeOldTrash;