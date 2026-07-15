const MAX_ASSET_BYTES = 12 * 1024 * 1024;

export class AssetStore {
  constructor(entries, fetchResource = window.fetch.bind(window), convertBlob = blobToDataUrl) {
    this.byId = new Map(entries.map(entry => [entry.id, entry]));
    this.fetchResource = fetchResource;
    this.convertBlob = convertBlob;
    this.cache = new Map();
  }

  has(assetId) {
    return this.byId.has(assetId);
  }

  async loadDataUrl(assetId) {
    if (!this.byId.has(assetId)) throw new Error("Unknown library asset.");
    if (this.cache.has(assetId)) return this.cache.get(assetId);

    const promise = this.fetchResource(this.byId.get(assetId).url)
      .then(response => {
        if (!response.ok) throw new Error("The library asset could not be loaded.");
        const size = Number(response.headers.get("content-length"));
        if (size && size > MAX_ASSET_BYTES) throw new Error("The library asset exceeds the 12 MB limit.");
        return response.blob();
      })
      .then(blob => {
        if (blob.size > MAX_ASSET_BYTES) throw new Error("The library asset exceeds the 12 MB limit.");
        return this.convertBlob(blob);
      })
      .catch(error => {
        this.cache.delete(assetId);
        throw error;
      });
    this.cache.set(assetId, promise);
    return promise;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("The library asset could not be decoded.")));
    reader.readAsDataURL(blob);
  });
}
