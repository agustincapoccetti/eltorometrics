import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Protected } from "@/lib/protected";
import { SemaforoView } from "@/components/SemaforoView";

export const Route = createFileRoute("/coach/semaforo")({
  component: () => (
    <Protected requireRole="coach">
      <Shell title="Semáforo semanal">
        <SemaforoView />
      </Shell>
    </Protected>
  ),
});
