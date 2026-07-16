import { builtInAssets } from "../services/builtinAssets.js";

export function textureSource(assetId, title) {
  return `// ${title} — image asset loaded through the sandbox bridge.
let texture;

function drawCover(image) {
  const imageWidth = image.naturalWidth ?? image.width;
  const imageHeight = image.naturalHeight ?? image.height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function render() {
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, width, height);
  if (!texture) return;
  drawCover(texture);

  // Add artwork above the texture or change this blend treatment.
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.1,
    width / 2, height / 2, Math.max(width, height) * 0.68
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.48)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

async function initialize() {
  texture = await loadImageAsset("${assetId}");
  render();
  console.info("${title} loaded through the export-safe asset bridge.");
}

onResize(render);
initialize().catch(error => console.error(error));`;
}

export function createUserImageEntry(record) {
  return {
    id: record.id,
    kind: "image",
    title: record.name,
    category: "My images",
    complexity: "User asset",
    description: `Locally stored ${record.mimeType.replace("image/", "").toUpperCase()} image ready for Canvas compositions.`,
    url: URL.createObjectURL(record.blob),
    origin: "Imported by the user",
    distributionNote: record.license,
    userAsset: true,
    source: textureSource(record.id, record.name)
  };
}

const DISTRIBUTION_NOTE = "Generated for Canvas Atelier; verify applicable distribution terms before commercial redistribution.";
const assetUrls = new Map(builtInAssets.map(asset => [asset.id, asset.url]));

export const textureAssets = [
  {
    id: "nebula-cyan-violet",
    kind: "image",
    title: "Cyan–violet nebula",
    category: "Space texture",
    complexity: "Raster asset",
    description: "Deep gaseous clouds and stardust for backgrounds, masks, and additive composites.",
    url: assetUrls.get("nebula-cyan-violet"),
    origin: "AI-assisted original generated for this project",
    distributionNote: DISTRIBUTION_NOTE,
    source: textureSource("nebula-cyan-violet", "Cyan–violet nebula")
  },
  {
    id: "mineral-teal-copper",
    kind: "image",
    title: "Teal–copper mineral",
    category: "Material texture",
    complexity: "Raster asset",
    description: "Layered mineral bands and copper veins for displacement, clipping, and luxury surfaces.",
    url: assetUrls.get("mineral-teal-copper"),
    origin: "AI-assisted original generated for this project",
    distributionNote: DISTRIBUTION_NOTE,
    source: textureSource("mineral-teal-copper", "Teal–copper mineral")
  },
  {
    id: "paper-ink-indigo",
    kind: "image",
    title: "Paper and indigo ink",
    category: "Analog texture",
    complexity: "Raster asset",
    description: "Fibrous paper, cloudy pigment, and restrained marks for editorial mixed-media work.",
    url: assetUrls.get("paper-ink-indigo"),
    origin: "AI-assisted original generated for this project",
    distributionNote: DISTRIBUTION_NOTE,
    source: textureSource("paper-ink-indigo", "Paper and indigo ink")
  },
  {
    id: "crystal-prismatic",
    kind: "image",
    title: "Prismatic crystal planes",
    category: "Geometric texture",
    complexity: "Raster asset",
    description: "Faceted translucent planes and diffraction accents for polished motion-design compositions.",
    url: assetUrls.get("crystal-prismatic"),
    origin: "AI-assisted original generated for this project",
    distributionNote: DISTRIBUTION_NOTE,
    source: textureSource("crystal-prismatic", "Prismatic crystal planes")
  }
];
