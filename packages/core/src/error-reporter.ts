import type { NodeOptions } from '@sentry/node';
import { close } from '@sentry/node';
import type { ErrorEvent, EventHint } from '@sentry/types';
import { AxiosError } from 'axios';
import {
	ApplicationError,
	isBaseError,
	ExecutionCancelledError,
	type ReportingOptions,
} from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { Service } from 'typedi';

import type { InstanceType } from './InstanceSettings';
import { Logger } from './logging/logger';

@Service()
export class ErrorReporter {
	/** Hashes of error stack traces, to deduplicate error reports. */
	private seenErrors = new Set<string>();

	private report: (error: Error | string, options?: ReportingOptions) => void;

	constructor(private readonly logger: Logger) {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		this.report = this.defaultReport;
	}

	private defaultReport(error: Error | string, options?: ReportingOptions) {
		if (error instanceof Error) {
			let e = error;

			const { executionId } = options ?? {};
			const context = executionId ? ` (execution ${executionId})` : '';

			do {
				let stack = '';
				let meta = undefined;
				if (e instanceof ApplicationError || isBaseError(e)) {
					if (e.level === 'error' && e.stack) {
						stack = `\n${e.stack}\n`;
					}
					meta = e.extra;
				}
				const msg = [e.message + context, stack].join('');
				this.logger.error(msg, meta);
				e = e.cause as Error;
			} while (e);
		}
	}

	async shutdown(timeoutInMs = 1000) {
		await close(timeoutInMs);
	}

	async init(instanceType: InstanceType | 'task_runner', dsn: string) {
		process.on('uncaughtException', (error) => {
			this.error(error);
		});

		if (!dsn) return;

		// Collect longer stacktraces
		Error.stackTraceLimit = 50;

		const {
			N8N_VERSION: release,
			ENVIRONMENT: environment,
			DEPLOYMENT_NAME: serverName,
		} = process.env;

		const { init, captureException, setTag } = await import('@sentry/node');
		const { requestDataIntegration, rewriteFramesIntegration } = await import('@sentry/node');

		const enabledIntegrations = [
			'InboundFilters',
			'FunctionToString',
			'LinkedErrors',
			'OnUnhandledRejection',
			'ContextLines',
		];

		init({
			dsn,
			release,
			environment,
			enableTracing: false,
			serverName,
			beforeBreadcrumb: () => null,
			beforeSend: this.beforeSend.bind(this) as NodeOptions['beforeSend'],
			integrations: (integrations) => [
				...integrations.filter(({ name }) => enabledIntegrations.includes(name)),
				rewriteFramesIntegration({ root: process.cwd() }),
				requestDataIntegration({
					include: {
						cookies: false,
						data: false,
						headers: false,
						query_string: false,
						url: true,
						user: false,
					},
				}),
			],
		});

		setTag('server_type', instanceType);

		this.report = (error, options) => captureException(error, options);
	}

	async beforeSend(event: ErrorEvent, { originalException }: EventHint) {
		if (!originalException) return null;

		if (originalException instanceof Promise) {
			originalException = await originalException.catch((error) => error as Error);
		}

		if (originalException instanceof AxiosError) return null;

		if (
			originalException instanceof Error &&
			originalException.name === 'QueryFailedError' &&
			['SQLITE_FULL', 'SQLITE_IOERR'].some((errMsg) => originalException.message.includes(errMsg))
		) {
			return null;
		}

		if (this.handleBaseError(event, originalException)) return null;
		if (this.handleApplicationError(event, originalException)) return null;

		if (
			originalException instanceof Error &&
			'cause' in originalException &&
			originalException.cause instanceof Error &&
			'level' in originalException.cause &&
			originalException.cause.level === 'warning'
		) {
			// handle underlying errors propagating from dependencies like ai-assistant-sdk
			return null;
		}

		if (originalException instanceof Error && originalException.stack) {
			const eventHash = createHash('sha1').update(originalException.stack).digest('base64');
			if (this.seenErrors.has(eventHash)) return null;
			this.seenErrors.add(eventHash);
		}

		return event;
	}

	error(e: unknown, options?: ReportingOptions) {
		if (e instanceof ExecutionCancelledError) return;
		const toReport = this.wrap(e);
		if (toReport) this.report(toReport, options);
	}

	warn(warning: Error | string, options?: ReportingOptions) {
		this.error(warning, { ...options, level: 'warning' });
	}

	info(msg: string, options?: ReportingOptions) {
		this.report(msg, { ...options, level: 'info' });
	}

	private wrap(e: unknown) {
		if (e instanceof Error) return e;
		if (typeof e === 'string') return new ApplicationError(e);
		return;
	}

	/** @returns Whether the error should be dropped */
	private handleBaseError(event: ErrorEvent, error: unknown): boolean {
		if (isBaseError(error)) {
			if (!error.shouldReport) return true;

			event.level = error.level;
			if (error.extra) event.extra = { ...event.extra, ...error.extra };
			if (error.tags) event.tags = { ...event.tags, ...error.tags };
		}

		return false;
	}

	/** @returns Whether the error should be dropped */
	private handleApplicationError(event: ErrorEvent, error: unknown): boolean {
		if (error instanceof ApplicationError) {
			const { level, extra, tags } = error;
			if (level === 'warning') return true;

			event.level = level;
			if (extra) event.extra = { ...event.extra, ...extra };
			if (tags) event.tags = { ...event.tags, ...tags };
		}

		return false;
	}
}
