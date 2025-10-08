import {
  Ban,
  CheckCheck,
  Merge,
  Rocket,
  Spline,
  Split,
  Trash2,
  // Import other icons as needed
} from "lucide-react"

export const iconMapping: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Rocket: Rocket,
  Spline: Spline,
  Split: Split,
  Merge: Merge,
  CheckCheck: CheckCheck,
  Ban: Ban,
  Trash2: Trash2,
  // Add other mappings here
}
