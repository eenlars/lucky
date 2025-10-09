declare module "react-json-view" {
  import type { CSSProperties, ComponentType } from "react"

  export interface ReactJsonViewProps {
    src: unknown
    name?: string | false
    theme?: string | object
    collapsed?: boolean | number
    collapseStringsAfterLength?: number
    groupArraysAfterLength?: number
    enableClipboard?: boolean | ((value: { src: unknown }) => void)
    displayObjectSize?: boolean
    displayDataTypes?: boolean
    indentWidth?: number
    iconStyle?: "circle" | "triangle" | "square"
    style?: CSSProperties
    sortKeys?: boolean | ((a: unknown, b: unknown) => number)
    onAdd?: (...args: unknown[]) => void
    onEdit?: (...args: unknown[]) => void
    onDelete?: (...args: unknown[]) => void
  }

  const ReactJsonView: ComponentType<ReactJsonViewProps>

  export default ReactJsonView
}
