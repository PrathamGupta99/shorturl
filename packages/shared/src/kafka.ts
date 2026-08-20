export interface KafkaConnectionOptions {
  brokers: string[];
  clientId: string;
  username?: string | undefined;
  password?: string | undefined;
}

export interface KafkaConnectionConfig {
  clientId: string;
  brokers: string[];
  ssl?: true;
  sasl?: { mechanism: 'plain'; username: string; password: string };
}

/**
 * Builds the brokers/ssl/sasl portion of a KafkaJS config. When both
 * credentials are present (managed Kafka such as Aiven), connects over TLS
 * with SASL/PLAIN. Otherwise falls back to a plaintext connection, matching
 * the unauthenticated Kafka broker used by local Docker Compose.
 */
export function buildKafkaConnectionConfig(options: KafkaConnectionOptions): KafkaConnectionConfig {
  const { brokers, clientId, username, password } = options;

  if (username && password) {
    return {
      clientId,
      brokers,
      ssl: true,
      sasl: { mechanism: 'plain', username, password }
    };
  }

  return { clientId, brokers };
}
