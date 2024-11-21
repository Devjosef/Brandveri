import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { loggers } from './contextLoggers';
import { env } from './envlogger';

class OpenTelemetryService {
  private static instance: OpenTelemetryService;
  private sdk: NodeSDK;
  private logger = loggers.api;

  private constructor() {
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    });

    this.sdk = new NodeSDK({
      resource: new Resource({
        'service.name': 'brandveri-api',
        'service.version': process.env.npm_package_version,
        'deployment.environment': env.NODE_ENV,
        'service.namespace': 'docucomp',
        'host.name': process.env.HOSTNAME,
      }),
      spanProcessor: new BatchSpanProcessor(traceExporter),
      instrumentations: [
        new HttpInstrumentation({
          requestHook: (span, request) => {
            if ('headers' in request && request.headers['x-request-id']) {
              span.setAttribute('http.request.id', request.headers['x-request-id']);
            }
          }
        }),
        new ExpressInstrumentation({
          ignoreLayers: ['/health', '/metrics']
        }),
        new PrismaInstrumentation()
      ]
    });
  }

  public static getInstance(): OpenTelemetryService {
    if (!OpenTelemetryService.instance) {
      OpenTelemetryService.instance = new OpenTelemetryService();
    }
    return OpenTelemetryService.instance;
  }

  public async start(): Promise<void> {
    try {
      await this.sdk.start();
      this.logger.info('OpenTelemetry initialized successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize OpenTelemetry');
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await this.sdk.shutdown();
      this.logger.info('OpenTelemetry shut down successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to shut down OpenTelemetry');
      throw error;
    }
  }
}

export const openTelemetry = OpenTelemetryService.getInstance();
