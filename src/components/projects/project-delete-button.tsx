"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProjectDeleteButtonProps = {
  projectId: string;
  projectName: string;
};

export function ProjectDeleteButton({ projectId, projectName }: ProjectDeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      `"${projectName}" 프로젝트를 삭제하시겠습니까?\n관련 워크플로우, 단계, 산출물 데이터도 함께 삭제됩니다.`
    );

    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        window.alert(data.error ?? "프로젝트 삭제에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      window.alert("프로젝트 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="icon-sm"
      aria-label={`${projectName} 삭제`}
      disabled={isDeleting}
      onClick={handleDelete}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
