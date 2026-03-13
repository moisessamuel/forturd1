import bcrypt from "bcryptjs";

// Generate bcrypt hash for admin password
async function generateHash() {
  const password = "gillette007";
  const hash = await bcrypt.hash(password, 10);
  console.log("Password:", password);
  console.log("Hash:", hash);
}

generateHash();
