declare module "react-json-editor-ajrm" {
  import type { ComponentType } from "react"

  interface JSONInputProps {
    id?: string
    placeholder?: any
    colors?: {
      default?: string
      background?: string
      string?: string
      number?: string
      colon?: string
      keys?: string
      keys_whiteSpace?: string
      primitive?: string
    }
    height?: string
    width?: string
    onKeyPressUpdate?: boolean
    onChange?: (result: any) => void
    theme?: string
    style?: any
  }

  const JSONInput: ComponentType<JSONInputProps>
  export default JSONInput
}
