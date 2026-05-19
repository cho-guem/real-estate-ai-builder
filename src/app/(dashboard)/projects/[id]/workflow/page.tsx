import { redirect } from "next/navigation";

interface WorkflowAliasPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowAliasPage({ params }: WorkflowAliasPageProps) {
  const { id } = await params;
  redirect(`/projects/${id}`);
}
