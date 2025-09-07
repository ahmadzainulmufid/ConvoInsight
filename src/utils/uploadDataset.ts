// export async function uploadDataset(file: File) {
//   const form = new FormData();
//   form.append("file", file);
//   const res = await fetch("http://localhost:8080/upload", {
//     method: "POST",
//     body: form,
//   });
//   const data = await res.json();
//   if (!data.ok) throw new Error(data.error || "Upload gagal");
//   return data;
// }
