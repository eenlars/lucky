import Link from "next/link"

export default function ExperimentsHome() {
  const links = [
    {
      href: "/experiments/capacity",
      title: "1. Tool Capacity",
      description: "Selection accuracy as tool count increases.",
      cta: "Open",
    },
    {
      href: "/experiments/sequential-results",
      title: "2. Sequential Chains",
      description: "Latest sequential execution outcomes.",
      cta: "Open",
    },
    {
      href: "/experiments/context-adaptation",
      title: "3. Context Adaptation",
      description: "Hidden-constraint adaptation results (vague vs clear).",
      cta: "Open",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Experiments</h1>
        <p className="text-gray-600 mb-8">Dedicated pages for each experiment.</p>

        <div className="space-y-4">
          {links.map(l => (
            <div key={l.href} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{l.title}</h2>
                <p className="text-sm text-gray-600">{l.description}</p>
              </div>
              <Link href={l.href} className="px-3 py-2 rounded-md bg-black text-white text-sm">
                {l.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
