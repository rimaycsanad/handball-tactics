export async function exportJson(name: string, value: unknown) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const file = new File([text], safeName, { type: "application/json" });
  if (
    matchMedia("(pointer: coarse)").matches &&
    navigator.canShare?.({ files: [file] })
  ) {
    await navigator.share({ files: [file], title: "Taktikák exportálása" });
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
