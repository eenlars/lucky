export const Constants = {
    public: {
        Enums: {
            EvolutionRunStatus: ["running", "completed", "failed", "interrupted"],
            FitnessMetric: ["success_rate", "usd_cost", "custom"],
            InvocationStatus: ["running", "completed", "failed", "rolled_back"],
            MessageRole: [
                "delegation",
                "result",
                "feedback",
                "data",
                "error",
                "control",
                "any",
                "result-error",
                "aggregated",
                "sequential",
            ],
            WorkflowOperation: ["init", "crossover", "mutation", "immigrant"],
        },
    },
};
