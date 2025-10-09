/**
 * MessageContent Component
 *
 * Renders message content with optional markdown and code highlighting
 */

"use client"

import { cn } from "@/lib/utils"

interface MessageContentProps {
  content: string
  enableMarkdown?: boolean
  enableCodeHighlighting?: boolean
  className?: string
}

export function MessageContent({
  content,
  enableMarkdown: _enableMarkdown = false,
  enableCodeHighlighting: _enableCodeHighlighting = false,
  className,
}: MessageContentProps) {
  // For now, render as plain text
  // In future iterations, add markdown parsing and code highlighting
  return <div className={cn("whitespace-pre-wrap break-words", className)}>{content}</div>
}

// TODO: Add markdown rendering
// import ReactMarkdown from 'react-markdown'
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'

// Example with markdown (for future):
// {enableMarkdown ? (
//   <ReactMarkdown
//     components={{
//       code({node, inline, className, children, ...props}) {
//         const match = /language-(\w+)/.exec(className || '')
//         return !inline && match && enableCodeHighlighting ? (
//           <SyntaxHighlighter language={match[1]} PreTag="div">
//             {String(children).replace(/\n$/, '')}
//           </SyntaxHighlighter>
//         ) : (
//           <code className={className} {...props}>
//             {children}
//           </code>
//         )
//       }
//     }}
//   >
//     {content}
//   </ReactMarkdown>
// ) : (
//   <div className={cn('whitespace-pre-wrap break-words', className)}>
//     {content}
//   </div>
// )}
