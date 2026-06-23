const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    menuItemCode: String,
    drinkName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
  },
  { timestamps: true, collection: "feedbacks" }
);

feedbackSchema.index(
  { userId: 1, orderId: 1, menuItemId: 1 },
  { unique: true }
);

feedbackSchema.statics.createFeedback = async function createFeedback(data) {
  const Feedback = this;
  const MenuItem = require("./menuItem.model");

  const rating = Number(data.rating);

  if (!data.userId || !data.orderId || !data.menuItemId) {
    throw new Error("User, order, and menu item are required.");
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const feedback = await Feedback.findOneAndUpdate(
    {
      userId: data.userId,
      orderId: data.orderId,
      menuItemId: data.menuItemId,
    },
    {
      userId: data.userId,
      orderId: data.orderId,
      menuItemId: data.menuItemId,
      menuItemCode: data.menuItemCode,
      drinkName: data.drinkName,
      rating,
      comment: data.comment || "",
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    }
  ).lean();

  const stats = await Feedback.aggregate([
    {
      $match: {
        menuItemId: feedback.menuItemId,
      },
    },
    {
      $group: {
        _id: "$menuItemId",
        averageRating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = Number((stats[0]?.averageRating || 0).toFixed(1));
  const ratingCount = stats[0]?.ratingCount || 0;

  await MenuItem.findByIdAndUpdate(feedback.menuItemId, {
    rating: averageRating,
    ratingCount,
  });

  return {
    ...feedback,
    averageRating,
    ratingCount,
  };
};

feedbackSchema.statics.getAverageRating = async function getAverageRating(menuItemId) {
  const stats = await this.aggregate([
    { $match: { menuItemId: new mongoose.Types.ObjectId(menuItemId) } },
    {
      $group: {
        _id: "$menuItemId",
        averageRating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  return {
    averageRating: Number((stats[0]?.averageRating || 0).toFixed(1)),
    ratingCount: stats[0]?.ratingCount || 0,
  };
};

module.exports = mongoose.model("Feedback", feedbackSchema);