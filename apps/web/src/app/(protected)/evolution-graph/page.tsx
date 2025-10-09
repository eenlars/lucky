import { DynamicEvolutionVisualization } from "@/app/components/DynamicEvolutionVisualization"
import { DevOnly } from "@/components/DevOnly"

export default function EvolutionGraphPage() {
  return (
    <DevOnly>
      <DynamicEvolutionVisualization />
    </DevOnly>
  )
}
