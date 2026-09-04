import type { AgentReasoner, EnforcementProvider, EvidenceProvider } from '../application/ports.js';
import { DeterministicAgentReasoner, FallbackAgentReasoner } from './agent-reasoners.js';
import type { AppConfiguration } from './configuration.js';
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
  const reasoner = configuration.llm
    ? new FallbackAgentReasoner(
        configuration.llm,
        configuration.policy.providers.timeoutMs,
        configuration.policy.agent.maximumRetries,
      )
    : new DeterministicAgentReasoner();
  if (configuration.mode === 'DEMO') {
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
      configuration.policy.providers.maximumAttempts,
    ),
    reasoner,
  };
}
