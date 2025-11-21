import api from "./api";

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  // backend debe devolver { url: "https://.../uploads/xxx.png" }
  return res.data.url as string;
}
