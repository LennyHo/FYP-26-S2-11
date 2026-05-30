# DripTea Database Class Diagram

A database class diagram shows each stored data object as a class, lists its important fields, and shows how the objects reference each other. For this project, the classes are based on the MongoDB/Mongoose models in `src/models/driptea.models.js`.

```mermaid
classDiagram
  direction LR

  class User {
    ObjectId _id
    String fullName
    String email
    String role
    String status
    String passwordHash
    String passwordSalt
    Date createdAt
    Date updatedAt
  }

  class MenuItem {
    ObjectId _id
    String itemId
    String name
    String image
    String category
    String[] tags
    Number price
    String description
    CustomizationOption[] customizationOptions
    NutritionInfo nutritionInfo
    String status
    Date createdAt
    Date updatedAt
  }

  class CustomizationOption {
    String name
    String type
    Mixed[] values
  }

  class NutritionInfo {
    Number baseVolumeMl
    Number baseCalories
    Number baseSugarG
    String nutriGrade
  }

  class CartItem {
    ObjectId _id
    ObjectId userId
    ObjectId menuItemId
    String menuItemCode
    String name
    String image
    String category
    Number quantity
    Number unitPrice
    Number lineTotal
    Mixed customization
    String status
    Date createdAt
    Date updatedAt
  }

  class Order {
    ObjectId _id
    ObjectId userId
    String orderNo
    String orderType
    String status
    Number totalAmount
    String voucherCode
    Date createdAt
    Date updatedAt
  }

  class OrderItem {
    ObjectId _id
    ObjectId orderId
    ObjectId userId
    ObjectId menuItemId
    String menuItemCode
    String name
    String image
    String category
    Number quantity
    Number unitPrice
    Number lineTotal
    Mixed customization
    Date createdAt
  }

  class Payment {
    ObjectId _id
    ObjectId orderId
    ObjectId userId
    String method
    String status
    Number amount
    String transactionRef
    Date createdAt
  }

  class Voucher {
    ObjectId _id
    String code
    String description
    String discountType
    Number discountValue
    Number minOrderAmount
    Date validFrom
    Date validTo
    Number usageLimit
    Number perUserLimit
    Number redeemedCount
    Boolean active
    Date createdAt
    Date updatedAt
  }

  class ChatbotSession {
    ObjectId _id
    ObjectId userId
    String conversationId
    ChatbotMessage[] messages
    Date createdAt
    Date updatedAt
  }

  class ChatbotMessage {
    String role
    String content
    Date createdAt
  }

  User "1" --> "0..*" CartItem
  User "1" --> "0..*" Order
  User "1" --> "0..*" OrderItem
  User "1" --> "0..*" Payment
  User "0..1" --> "0..*" ChatbotSession

  MenuItem "0..1" --> "0..*" CartItem
  MenuItem "0..1" --> "0..*" OrderItem

  MenuItem "1" *-- "0..*" CustomizationOption
  MenuItem "1" *-- "1" NutritionInfo

  Order "1" --> "1..*" OrderItem
  Order "1" --> "0..1" Payment
  Voucher "0..1" --> "0..*" Order

  ChatbotSession "1" *-- "0..*" ChatbotMessage
```

## Collections Represented

- `users`
- `menu_items`
- `cart_items`
- `orders`
- `order_items`
- `payments`
- `vouchers`
- `chatbot_sessions`

## Notes

- `CustomizationOption`, `NutritionInfo`, and `ChatbotMessage` are embedded subdocuments, not separate MongoDB collections.
- `CartItem` and `OrderItem` keep copied item details such as `name`, `unitPrice`, and `customization` so historical cart/order records do not depend only on the current menu item.
- `Order.voucherCode` stores the voucher code string instead of a direct `ObjectId` reference to `Voucher`.

## Relationship Rules

- `1` means the record must be linked to exactly one record on that side.
- `0..1` means the link is optional, with at most one linked record.
- `0..*` means zero or many linked records can exist.
- `1..*` means at least one linked record is expected.
- Solid diamond `*--` marks embedded subdocuments stored inside the parent MongoDB document.
