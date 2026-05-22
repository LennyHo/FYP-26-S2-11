# DripTea Database Schema

This backend uses MongoDB with Mongoose. The default database name is `fyp-chatbot`, configured by `MONGODB_DB_NAME` in `.env`.

Connection setup lives in `src/config/mongo.js`. The Mongoose schemas and models live in `src/models/driptea.models.js`.

## Collections

The application creates these collections:

- `users`
- `menu_items`
- `cart_items`
- `orders`
- `order_items`
- `payments`
- `chatbot_sessions`

## users

Stores customer, store staff, and admin accounts.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `fullName` | String | Yes | User display name |
| `email` | String | Yes | Lowercased and unique |
| `role` | String | Yes | `user_admin`, `store_staff`, or `customer` |
| `status` | String | Yes | `active` or `suspended` |
| `passwordHash` | String | Yes | PBKDF2 password hash |
| `passwordSalt` | String | Yes | Salt used for password hashing |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |
| `updatedAt` | Date | Yes | Added by Mongoose timestamps |

Indexes:

```js
{ email: 1 } // unique
{ role: 1, status: 1 }
```

## menu_items

Stores the drinks available for ordering.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `itemId` | String | Yes | Public menu code, unique, e.g. `b001` |
| `name` | String | Yes | Drink name |
| `image` | String | No | Image path or URL |
| `category` | String | Yes | Drink category |
| `tags` | String[] | No | Search/filter tags |
| `price` | Number | Yes | Base price |
| `description` | String | No | Menu description |
| `customizationOptions` | Object[] | No | Sugar, ice, and topping options |
| `nutritionInfo` | Object | Yes | Base nutrition values |
| `status` | String | Yes | `active` or `inactive` |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |
| `updatedAt` | Date | Yes | Added by Mongoose timestamps |

`customizationOptions` shape:

```js
{
  name: String,
  type: "single" | "multiple",
  values: [Mixed]
}
```

`nutritionInfo` shape:

```js
{
  baseVolumeMl: Number,
  baseCalories: Number,
  baseSugarG: Number,
  nutriGrade: "A" | "B" | "C" | "D"
}
```

Indexes:

```js
{ itemId: 1 } // unique
{ category: 1, status: 1 }
```

## cart_items

Stores temporary cart rows for logged-in users before checkout.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `userId` | ObjectId | Yes | References `users._id` |
| `menuItemId` | ObjectId/null | No | References `menu_items._id` when matched |
| `menuItemCode` | String/null | No | Matches `menu_items.itemId` |
| `name` | String | Yes | Drink name at time of cart add |
| `image` | String | No | Drink image |
| `category` | String | No | Drink category |
| `quantity` | Number | Yes | Minimum `1` |
| `unitPrice` | Number | Yes | Price per customized unit |
| `lineTotal` | Number | Yes | Total for this cart row |
| `customization` | Mixed | No | Size, ice, sugar, toppings, nutrition |
| `status` | String | Yes | `active` or `removed` |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |
| `updatedAt` | Date | Yes | Added by Mongoose timestamps |

Index:

```js
{ userId: 1, createdAt: 1 }
```

## orders

Stores submitted customer orders.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `userId` | ObjectId | Yes | References `users._id` |
| `orderNo` | String | Yes | Human-readable order number, e.g. `DT-...` |
| `orderType` | String | Yes | Currently `manual` |
| `status` | String | Yes | `pending`, `preparing`, `ready`, or `completed` |
| `totalAmount` | Number | Yes | Order total |
| `currency` | String | Yes | Defaults to `SGD` |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |
| `updatedAt` | Date | Yes | Added by Mongoose timestamps |

Index:

```js
{ userId: 1, status: 1 }
```

## order_items

Stores individual line items for submitted orders.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `orderId` | ObjectId | Yes | References `orders._id` |
| `userId` | ObjectId | Yes | References `users._id` |
| `menuItemId` | ObjectId/null | No | References `menu_items._id` when matched |
| `menuItemCode` | String/null | No | Matches `menu_items.itemId` |
| `name` | String | Yes | Drink name at time of order |
| `image` | String | No | Drink image |
| `category` | String | No | Drink category |
| `quantity` | Number | Yes | Minimum `1` |
| `unitPrice` | Number | Yes | Price per customized unit |
| `lineTotal` | Number | Yes | Total for this order row |
| `customization` | Mixed | No | Size, ice, sugar, toppings, nutrition |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |

Index:

```js
{ orderId: 1 }
```

## payments

Stores payment records created during checkout.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `orderId` | ObjectId | Yes | References `orders._id` |
| `userId` | ObjectId | Yes | References `users._id` |
| `method` | String | Yes | Payment method, currently defaults to `fake_card` |
| `status` | String | Yes | `paid`, `unpaid`, or `failed` |
| `amount` | Number | Yes | Payment amount |
| `currency` | String | Yes | Defaults to `SGD` |
| `transactionRef` | String | Yes | Fake transaction reference |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |

Index:

```js
{ orderId: 1 }
```

## chatbot_sessions

Reserved for storing chatbot conversations. The current chat route still keeps conversation memory in process memory, so this collection is defined but not actively written by the main chat endpoint yet.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `_id` | ObjectId | Yes | MongoDB document id |
| `userId` | ObjectId/null | No | References `users._id` when a logged-in user is attached |
| `conversationId` | String | No | Client conversation id |
| `messages` | Object[] | No | Chat message history |
| `createdAt` | Date | Yes | Added by Mongoose timestamps |
| `updatedAt` | Date | Yes | Added by Mongoose timestamps |

Message shape:

```js
{
  role: "user" | "assistant" | "system",
  content: String,
  createdAt: Date
}
```

Index:

```js
{ userId: 1, updatedAt: -1 }
```

## Relationships

```text
users._id
  -> cart_items.userId
  -> orders.userId
  -> order_items.userId
  -> payments.userId
  -> chatbot_sessions.userId

menu_items._id
  -> cart_items.menuItemId
  -> order_items.menuItemId

orders._id
  -> order_items.orderId
  -> payments.orderId
```

## Seed Data

The backend seeds:

- Three users: admin, store staff, and customer.
- Menu items from `data/menu.json`.

The setup runs lazily when a DripTea API route calls `getPreparedDb()`. You can also trigger it manually:

```http
POST /api/mongo/setup
```
