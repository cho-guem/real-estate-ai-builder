import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronLeft } from "lucide-react";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "새 프로젝트" };

export default function NewProjectPage() {
  return (
    <div className="p-6 lg:p-8">
      {/* 브레드크럼 */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          프로젝트 목록으로
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">새 프로젝트 만들기</h1>
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3 w-3" />
              부동산 MVP
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            프로젝트 정보를 입력하면 AI가 맞춤형 부동산 웹사이트를 생성해드려요.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            현재는 부동산 웹사이트 제작에 집중합니다. 제조업, 병원, 학원 프리셋은 이후 확장 예정입니다.
          </p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <CreateProjectForm />
        </div>
      </div>
    </div>
  );
}
