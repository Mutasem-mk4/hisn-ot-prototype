import type { AgentReasoner, EnforcementProvider, EvidenceProvider } from '../application/ports.js';
import { DeterministicAgentReasoner, LangGraphAgentReasoner } from './agent-reasoners.js';
import type { AppConfiguration } from './configuration.js';
import {
  NokiaSimulatorEnforcementProvider,
  NokiaSimulatorEvidenceProvider,
} from './hybrid-providers.js';
import { NokiaEnforcementProvider, NokiaEvidenceProvider } from './nokia-providers.js';
import { SimulatedEnforcementProvider, SimulatedEvidenceProvider } from './simulated-providers.js';
import {
  UnavailableEnforcementProvider,
  UnavailableEvidenceProvider,
} from './unavailable-providers.js';

export type ProviderSet = {
  evidence: EvidenceProvider;
  enforcement: EnforcementProvider;
  reasoner: AgentReasoner;
};

export function createProviders(configuration: AppConfiguration): ProviderSet {
  const modelTimeoutMs = Math.min(4_000, configuration.policy.agent.maximumRuntimeMs);
  const reasoner = configuration.llm
    ? new LangGraphAgentReasoner(
        configuration.llm,
        modelTimeoutMs,
        configuration.policy.agent.maximumRetries,
      )
    : new DeterministicAgentReasoner();
  if (configuration.mode === 'DEMO') {
    if (configuration.nokiaSimulatorEnabled && configuration.nac) {
      return {
        evidence: new NokiaSimulatorEvidenceProvider(
          new NokiaEvidenceProvider(
            'SANDBOX',
            configuration.nac,
            configuration.policy.providers.timeoutMs,
            configuration.policy.providers.maximumAttempts,
          ),
          new SimulatedEvidenceProvider(),
        ),
        enforcement: new NokiaSimulatorEnforcementProvider(
          new NokiaEnforcementProvider(
            'SANDBOX',
            configuration.nac,
            configuration.policy.providers.timeoutMs,
          ),
          new SimulatedEnforcementProvider(),
        ),
        reasoner,
      };
    }
    return {
      evidence: new SimulatedEvidenceProvider(),
      enforcement: new SimulatedEnforcementProvider(),
      reasoner,
    };
  }
  if (configuration.nac === null) {
    return {
      evidence: new UnavailableEvidenceProvider(),
      enforcement: new UnavailableEnforcementProvider(),
      reasoner,
    };
  }
  return {
    evidence: new NokiaEvidenceProvider(
      configuration.mode,
      configuration.nac,
      configuration.policy.providers.timeoutMs,
      configuration.policy.providers.maximumAttempts,
    ),
    enforcement: new NokiaEnforcementProvider(
      configuration.mode,
      configuration.nac,
      configuration.policy.providers.timeoutMs,
    ),
    reasoner,
  };
}
