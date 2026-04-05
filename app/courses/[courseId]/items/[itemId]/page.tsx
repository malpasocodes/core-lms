import { redirect } from "next/navigation";

type ItemPageProps = {
  params: Promise<{ courseId: string; itemId: string }>;
};

export default async function LegacyItemRedirect(props: ItemPageProps) {
  const { courseId, itemId } = await props.params;
  redirect(`/courses/${courseId}/activities/${itemId}`);
}
