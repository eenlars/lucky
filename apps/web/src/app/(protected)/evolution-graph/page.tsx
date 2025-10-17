import { DynamicEvolutionVisualization } from "@/app/components/evolution/DynamicEvolutionVisualization"
import { DevOnly } from "@/components/DevOnly"

export default function EvolutionGraphPage() {
  return (
    <DevOnly>
      <DynamicEvolutionVisualization />
    </DevOnly>
  )
}
