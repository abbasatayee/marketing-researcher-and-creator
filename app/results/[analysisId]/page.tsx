import { ResultsView } from "./resultsView";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ analysisId: string }>;
}) {
  const { analysisId } = await params;
  return <ResultsView analysisId={analysisId} />;
}
