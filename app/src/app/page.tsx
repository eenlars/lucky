import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white pt-24">
      <div className="max-w-4xl mx-auto px-8">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-extralight text-black tracking-tight mb-6">
            Automated Agentic Workflows
          </h1>
          <p className="text-lg font-light text-black/60 tracking-wide">
            Creating nodes that learn the optimal workflow to solve specific
            tasks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <Link
            href="/edit"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">✎</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Editor</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">
              Create and edit workflow definitions
            </p>
          </Link>

          <Link
            href="/invocations"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">●</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Traces</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">
              View workflow execution history
            </p>
          </Link>

          <Link
            href="/evolution"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">◊</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Evolution</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">
              View genetic programming runs
            </p>
          </Link>

          <Link
            href="/ingestions"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">⇪</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Ingestions</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">
              Upload inputs and run workflows on them
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
