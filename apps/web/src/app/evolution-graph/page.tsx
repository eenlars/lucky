import { DevOnly } from "@/components/DevOnly"
import { DynamicEvolutionVisualization } from "../components/DynamicEvolutionVisualization"

export default function EvolutionGraphPage() {
  return (
    <DevOnly>
      <DynamicEvolutionVisualization />
    </DevOnly>
  )
}
