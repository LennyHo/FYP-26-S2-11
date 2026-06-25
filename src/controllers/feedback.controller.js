const Feedback = require("../models/feedback.model");
const MenuItem = require("../models/menuItem.model");

async function createFeedback(req, res) {
    try {
    const {
        userId,
        orderId,
        menuItemId,
        menuItemCode,
        drinkName,
        rating,
        comment,
    } = req.body;

    let finalMenuItemId = menuItemId;

    if (!finalMenuItemId && menuItemCode) {
        const menuItem = await MenuItem.findOne({ itemId: menuItemCode }).lean();

        if (!menuItem) {
        return res.status(404).json({
            ok: false,
            message: "Menu item not found.",
        });
        }

        finalMenuItemId = menuItem._id;
    }

    const feedback = await Feedback.createFeedback({
        userId,
        orderId,
        menuItemId: finalMenuItemId,
        menuItemCode,
        drinkName,
        rating,
        comment,
    });

    return res.status(201).json({
        ok: true,
        message: "Feedback submitted.",
        data: feedback,
    });
    } catch (error) {
    console.error("[FeedbackController] createFeedback error:", error.message);

    return res.status(400).json({
        ok: false,
        message: error.message || "Failed to submit feedback.",
    });
    }
}

async function getAverageRating(req, res) {
    try {
        const { menuItemId } = req.params;

        const rating = await Feedback.getAverageRating(menuItemId);

        return res.json({
            ok: true,
            data: rating,
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: "Failed to load rating.",
        });
    }
}

async function getOrderFeedbacks(req, res) {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const grouped = await Feedback.getByOrderIds(ids);
    res.json({ ok: true, data: grouped });
  } catch (error) {
    console.error("[FeedbackController] getOrderFeedbacks error:", error.message);
    res.status(500).json({ ok: false, message: "Failed to load order feedbacks." });
  }
}

module.exports = {
    createFeedback,
    getAverageRating,
    getOrderFeedbacks,
};