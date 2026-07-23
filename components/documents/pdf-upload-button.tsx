"use client";

import { ChangeEvent, useId, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

type PdfUploadButtonProps = {
  variant?: "primary" | "empty";
};

export function PdfUploadButton({ variant = "primary" }: PdfUploadButtonProps) {
  const inputId = useId();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage("");
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const imageExtension = ALLOWED_IMAGE_EXTENSIONS.find((extension) => fileName.endsWith(`.${extension}`));
    const isImage = Boolean(imageExtension) || file.type.startsWith("image/");
    if (!isPdf && !isImage) return setMessage("PDF 또는 JPG/PNG 이미지 파일만 업로드할 수 있습니다.");
    if (file.size > MAX_FILE_SIZE) return setMessage("파일 크기는 20MB 이하여야 합니다.");

    const supabase = createClient();
    if (!supabase) return setMessage("Supabase 환경변수를 확인해주세요.");

    setIsUploading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setIsUploading(false);
      return setMessage("로그인이 만료되었습니다. 다시 로그인해주세요.");
    }

    const documentId = crypto.randomUUID();
    const extension = isPdf ? "pdf" : (imageExtension ?? fileName.split(".").pop() ?? "jpg");
    const filePath = `${user.id}/${documentId}.${extension}`;
    const title = file.name.replace(/\.(pdf|jpg|jpeg|png|webp|heic|heif)$/i, "").slice(0, 200) || "제목 없는 자료";

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: file.type || (isPdf ? "application/pdf" : "image/jpeg"), upsert: false });

    if (uploadError) {
      setIsUploading(false);
      return setMessage(`업로드 실패: ${uploadError.message}`);
    }

    const { error: documentError } = await supabase.from("documents").insert({
      id: documentId,
      user_id: user.id,
      title,
      file_path: filePath,
      status: "queued",
    });

    if (documentError) {
      await supabase.storage.from("documents").remove([filePath]);
      setIsUploading(false);
      return setMessage(`자료 저장 실패: ${documentError.message}`);
    }

    const analysisResponse = await fetch(`/api/documents/${documentId}/analyze`, { method: "POST" });
    setIsUploading(false);
    setMessage(analysisResponse.ok ? "업로드와 AI 분석이 완료되었습니다." : "업로드 완료. AI 분석 설정을 확인해주세요.");
    router.refresh();
  }

  if (variant === "empty") {
    return (
      <div>
        <label htmlFor={inputId} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--accent-dark)]">
          <Upload size={17} /> {isUploading ? "업로드 중..." : "PDF / 사진 선택"}
        </label>
        <input id={inputId} className="sr-only" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif" disabled={isUploading} onChange={uploadPdf} />
        {message && <p className={`mt-3 text-sm ${message.startsWith("업로드 완료") ? "text-green-700" : "text-red-600"}`} role="status">{message}</p>}
      </div>
    );
  }

  return (
    <div className="w-full text-left sm:w-auto sm:text-right">
      <label htmlFor={inputId} className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 font-bold text-white hover:bg-[var(--accent-dark)] sm:w-auto ${isUploading ? "cursor-wait opacity-60" : "cursor-pointer"}`}>
        <Plus size={18} /> {isUploading ? "업로드 중..." : "자료 추가"}
      </label>
      <input id={inputId} className="sr-only" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif" disabled={isUploading} onChange={uploadPdf} />
      {message && <p className={`mt-2 max-w-full break-words text-xs sm:max-w-xs ${message.startsWith("업로드 완료") ? "text-green-700" : "text-red-600"}`} role="status">{message}</p>}
    </div>
  );
}
