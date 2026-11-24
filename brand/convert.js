// Convert logo-icon.svg -> PNG for favicon & android launcher
const sharp = require("sharp");
const path = require("path");

async function run() {
  const src = path.join(__dirname, "logo-icon.svg");

  // favicon / web: 256x256
  await sharp(src).resize(256, 256).png().toFile(path.join(__dirname, "logo-icon-256.png"));
  console.log("✓ logo-icon-256.png");

  // android launcher: 512x512
  await sharp(src).resize(512, 512).png().toFile(path.join(__dirname, "logo-icon-512.png"));
  console.log("✓ logo-icon-512.png");

  // favicon.ico-compatible 32px (also saved as png; browser favicon can use svg)
  await sharp(src).resize(64, 64).png().toFile(path.join(__dirname, "logo-icon-64.png"));
  console.log("✓ logo-icon-64.png");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});