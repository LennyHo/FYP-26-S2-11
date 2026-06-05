const purchaseHistoryService = require("../services/purchaseHistory.service");

async function getPurchaseHistory(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        message: "User ID is required.",
      });
    }

    const orders = await purchaseHistoryService.getPurchaseHistory(userId);

    res.json({
      ok: true,
      data: orders.map((order) => ({
        id: order._id.toString(),
        orderNo: order.orderNo,
        displayOrderNo: order.displayOrderNo,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: order.items || [],
      })),
    });
  } catch (error) {
    console.error("[PurchaseHistoryController] Failed:", error);
    res.status(500).json({
      ok: false,
      message: "Unable to load purchase history.",
    });
  }
}

module.exports = {
  getPurchaseHistory,
};