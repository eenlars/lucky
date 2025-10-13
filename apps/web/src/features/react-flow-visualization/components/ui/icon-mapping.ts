import {
  Ban,
  CheckCheck,
  Merge,
  Plug,
  Rocket,
  Spline,
  Split,
  Trash2,
  User,
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
  User: User,
  Plug: Plug,
  // Add other mappings here
}
