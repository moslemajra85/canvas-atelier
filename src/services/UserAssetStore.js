const DATABASE_NAME = "canvas-atelier-assets";
const STORE_NAME = "assets";
const DATABASE_VERSION = 1;
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export class UserAssetStore {
  constructor(openDatabase = () => openAssetDatabase()) {
    this.openDatabase = openDatabase;
  }

  async list() {
    const database = await this.openDatabase();
    return requestResult(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
  }

  async saveFile(file, { name = file.name, license = "User supplied" } = {}) {
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("Use PNG, JPEG, WebP, or SVG images.");
    if (!file.size || file.size > MAX_ASSET_BYTES) throw new Error("Images must be smaller than 12 MB.");
    const blob = file.type === "image/svg+xml" ? await sanitizeSvg(file) : file;
    const slug = String(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "image";
    const record = {
      id: `user-${slug}-${Date.now().toString(36)}`,
      name: String(name).trim().slice(0, 80) || "Untitled image",
      mimeType: blob.type,
      license: String(license).trim().slice(0, 120) || "User supplied",
      createdAt: new Date().toISOString(),
      blob
    };
    await this.put(record);
    return record;
  }

  async put(record) {
    if (!record?.id?.startsWith("user-") || !(record.blob instanceof Blob)) throw new Error("Invalid user asset.");
    const database = await this.openDatabase();
    await transactionComplete(database.transaction(STORE_NAME, "readwrite"), transaction => {
      transaction.objectStore(STORE_NAME).put(record);
    });
    return record;
  }

  async remove(assetId) {
    const database = await this.openDatabase();
    await transactionComplete(database.transaction(STORE_NAME, "readwrite"), transaction => {
      transaction.objectStore(STORE_NAME).delete(assetId);
    });
  }

  async exportRecords(assetIds = null) {
    const includedIds = assetIds ? new Set(assetIds) : null;
    const records = (await this.list()).filter(record => !includedIds || includedIds.has(record.id));
    return Promise.all(records.map(async record => ({
      id: record.id,
      name: record.name,
      mimeType: record.mimeType,
      license: record.license,
      dataUrl: await blobToDataUrl(record.blob)
    })));
  }

  async importRecords(records) {
    const imported = [];
    for (const record of records) {
      const response = await fetch(record.dataUrl);
      const blob = await response.blob();
      if (blob.size > MAX_ASSET_BYTES || !ALLOWED_TYPES.has(blob.type)) continue;
      const safeBlob = blob.type === "image/svg+xml" ? await sanitizeSvg(blob) : blob;
      const saved = { ...record, mimeType: safeBlob.type, createdAt: new Date().toISOString(), blob: safeBlob };
      await this.put(saved);
      imported.push(saved);
    }
    return imported;
  }
}

function openAssetDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(new Error("The browser asset database is unavailable.")), { once: true });
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(new Error("Asset storage request failed.")), { once: true });
  });
}

function transactionComplete(transaction, action) {
  return new Promise((resolve, reject) => {
    action(transaction);
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("error", () => reject(new Error("Asset storage transaction failed.")), { once: true });
    transaction.addEventListener("abort", () => reject(new Error("Asset storage transaction was cancelled.")), { once: true });
  });
}

async function sanitizeSvg(file) {
  const source = await file.text();
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (document.querySelector("parsererror, script, foreignObject, iframe, object, embed")) throw new Error("The SVG contains unsupported active content.");
  for (const element of document.querySelectorAll("*")) {
    if (element.localName === "style" && /(?:@import|url\(\s*['\"]?(?!#|data:image\/))/i.test(element.textContent)) {
      throw new Error("The SVG contains external style resources.");
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const externalHref = (name === "href" || name.endsWith(":href")) && !attribute.value.startsWith("#") && !attribute.value.startsWith("data:image/");
      const externalCssUrl = /url\(\s*['\"]?(?!#|data:image\/)/i.test(attribute.value);
      if (name.startsWith("on") || externalHref || externalCssUrl) {
        throw new Error("The SVG contains external or executable content.");
      }
    }
  }
  return new Blob([new XMLSerializer().serializeToString(document.documentElement)], { type: "image/svg+xml" });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result), { once: true });
    reader.addEventListener("error", () => reject(new Error("The image could not be encoded.")), { once: true });
    reader.readAsDataURL(blob);
  });
}
