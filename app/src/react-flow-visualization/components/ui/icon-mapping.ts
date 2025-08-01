import {
  Rocket,
  Spline,
  Split,
  Merge,
  CheckCheck,
  Ban,
  // Import other icons as needed
} from "lucide-react"

export const iconMapping: Record<
  string,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  Rocket: Rocket,
  Spline: Spline,
  Split: Split,
  Merge: Merge,
  CheckCheck: CheckCheck,
  Ban: Ban,
  // Add other mappings here
}
