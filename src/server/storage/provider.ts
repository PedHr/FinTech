import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { env } from "@/shared/lib/env";

export interface StorageProvider {
  put(key: string, data: Uint8Array, contentType: string): Promise<{ key: string; size: number }>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

function localPath(key: string) {
  const root = path.resolve(env().LOCAL_STORAGE_PATH);
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Chave de storage inválida.");
  return { root, target };
}

const localStorage: StorageProvider = {
  async put(key, data) {
    const { target } = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: "wx" });
    return { key, size: data.byteLength };
  },
  async get(key) {
    return new Uint8Array(await readFile(localPath(key).target));
  },
  async delete(key) {
    try { await unlink(localPath(key).target); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },
};

const blobStorage: StorageProvider = {
  async put(key, data, contentType) {
    const blob = await put(key, Buffer.from(data), { access: "private", contentType, addRandomSuffix: false });
    return { key: blob.pathname, size: data.byteLength };
  },
  async get(key) {
    const result = await get(key, { access: "private" });
    if (!result || result.statusCode !== 200) throw new Error("Arquivo não encontrado.");
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  },
  async delete(key) { await del(key); },
};

export function storageProvider(): StorageProvider {
  return env().STORAGE_DRIVER === "vercel-blob" ? blobStorage : localStorage;
}
