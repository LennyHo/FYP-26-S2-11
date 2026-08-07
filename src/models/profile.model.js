const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    // Slug used as the role value.
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    // Built-ins cannot be deleted — auth checks depend on them.
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const BUILT_IN_PROFILES = [
  { value: "customer", label: "Customer", isBuiltIn: true },
  { value: "store_staff", label: "Store Staff", isBuiltIn: true },
  { value: "user_admin", label: "Admin", isBuiltIn: true },
];

const Profile = mongoose.model("Profile", profileSchema);

// $setOnInsert so existing edits are never overwritten.
async function seedBuiltInProfiles() {
  await Promise.all(
    BUILT_IN_PROFILES.map((profile) =>
      Profile.updateOne(
        { value: profile.value },
        { $setOnInsert: { ...profile, description: "", status: "active" } },
        { upsert: true }
      )
    )
  );
}

module.exports = Profile;
module.exports.seedBuiltInProfiles = seedBuiltInProfiles;
module.exports.BUILT_IN_PROFILES = BUILT_IN_PROFILES;
