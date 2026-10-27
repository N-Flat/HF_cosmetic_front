import sharp from "sharp";
const shapes = {
  star: '<path d="m64 9 14 35 38 3-29 25 9 38-32-20-33 20 9-38L11 47l39-3Z" fill="#efbd59" stroke="#fff3ca" stroke-width="4"/>',
  planet:
    '<circle cx="64" cy="64" r="30" fill="#a7afd7"/><ellipse cx="64" cy="64" rx="53" ry="13" transform="rotate(-28 64 64)" fill="none" stroke="#e3c787" stroke-width="8"/><path d="M40 46Q62 30 84 46" fill="none" stroke="#cbd0ec" stroke-width="5"/>',
  glitter:
    '<path d="M64 10Q68 59 112 64Q68 69 64 116Q59 69 16 64Q59 58 64 10" fill="#e8d28c"/><path d="M100 10Q102 25 117 27Q102 29 100 45Q98 29 83 27Q98 25 100 10" fill="#ffffdf"/>',
};
for (const [key, shape] of Object.entries(shapes))
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${shape}</svg>`,
    ),
  )
    .resize(128, 128)
    .png()
    .toFile(`public/stamps/${key}.png`);
console.log("Stamp PNGs created");
